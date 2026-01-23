import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { BowActionType } from '@prisma/client';
import { BowActionExecuteDto } from './dto/bow.dto';
import { BowRecommendationEngine } from './bow-recommendation.service';
import { BowPriceTracker } from './bow-price-tracker.service';
import { BowOutfitRecommender } from './bow-outfit-recommender.service';
import { BowSmartReminders } from './bow-smart-reminders.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BowActionService {
    private readonly logger = new Logger(BowActionService.name);

    constructor(
        private cartService: CartService,
        private recommendationService: BowRecommendationEngine,
        private priceTrackerService: BowPriceTracker,
        private outfitRecommenderService: BowOutfitRecommender,
        private smartRemindersService: BowSmartReminders,
        private prisma: PrismaService
    ) { }

    async executeAction(userId: string, dto: BowActionExecuteDto) {
        const { action, payload } = dto;

        // Log action in BowInteraction
        await this.prisma.bowInteraction.create({
            data: {
                user: { connect: { id: userId } },
                sessionId: 'system', // Default session
                type: 'ACTION',
                actionType: action
            }
        });

        try {
            let result;
            let success = true;
            let userMessage: string | undefined;

            switch (action) {
                // Core Cart Actions
                case BowActionType.ADD_TO_CART:
                    result = await this.cartService.addItem(userId, {
                        productId: payload.productId,
                        variantId: payload.variantId,
                        quantity: payload.quantity || 1
                    });
                    userMessage = 'Added to your cart.';

                    // Auto-trigger complementary items suggestion
                    this.logger.log(`Added product ${payload.productId} to cart, checking for complements`);
                    break;

                case BowActionType.REMOVE_FROM_CART:
                    // Allow removal by productId if itemId not provided
                    let itemId = payload.itemId;
                    if (!itemId && payload.productId) {
                        const cartItem = await this.prisma.cartItem.findFirst({
                            where: {
                                productId: payload.productId,
                                cart: { userId }
                            },
                            select: { id: true }
                        });
                        itemId = cartItem?.id;
                    }

                    if (!itemId) {
                        // Gracefully handle missing item instead of throwing
                        success = false;
                        userMessage = 'That item is not in your cart anymore.';
                        result = await this.cartService.getCart(userId);
                        break;
                    }

                    result = await this.cartService.removeItem(userId, itemId);
                    userMessage = 'Removed from your cart.';
                    break;

                case BowActionType.UPDATE_QUANTITY:
                    if (!payload.itemId) throw new BadRequestException('Item ID required');
                    result = await this.cartService.updateItem(userId, payload.itemId, { quantity: payload.quantity });
                    break;

                // Navigation
                case BowActionType.NAVIGATE:
                    return {
                        success: true,
                        action: 'navigate',
                        target: payload.targetPage,
                        message: `Navigating to ${payload.targetPage}...`
                    };

                // Smart View Cart with Optimization
                case BowActionType.VIEW_CART:
                    return {
                        success: true,
                        action: 'view_cart',
                        message: 'Here\'s your cart!',
                        metadata: {
                            timestamp: new Date(),
                            userId
                        }
                    };

                // AI-Enhanced Recommendations
                case BowActionType.GET_RECOMMENDATIONS:
                    const smartRecommendations = await this.recommendationService.getSmartRecommendations(userId, 5);
                    return {
                        success: true,
                        action: 'recommendations',
                        message: 'AI-picked recommendations just for you!',
                        recommendations: smartRecommendations,
                        metadata: {
                            source: 'smart_recommendations',
                            count: smartRecommendations?.length || 0
                        }
                    };

                // New AI Actions
                case 'FIND_DEALS' as any:
                    const deals = await this.priceTrackerService.findBestDeals(payload.limit || 10);
                    return {
                        success: true,
                        action: 'find_deals',
                        message: `Found ${deals?.length || 0} amazing deals!`,
                        deals,
                        metadata: {
                            source: 'price_tracker',
                            dealCount: deals?.length || 0
                        }
                    };

                case 'SUGGEST_OUTFIT' as any:
                    const outfit = await this.outfitRecommenderService.suggestOutfit(userId, payload.occasion || 'casual');
                    return {
                        success: true,
                        action: 'suggest_outfit',
                        message: `Complete ${payload.occasion || 'casual'} outfit ready!`,
                        outfit,
                        metadata: {
                            source: 'outfit_recommender',
                            occasion: payload.occasion || 'casual'
                        }
                    };

                case 'GET_REMINDERS' as any:
                    const reminders = await this.smartRemindersService.getReplenishmentReminders(userId);
                    const wishlistReminders = await this.smartRemindersService.getSmartWishlist(userId);
                    return {
                        success: true,
                        action: 'get_reminders',
                        message: `You have ${reminders?.length || 0} replenishment reminders!`,
                        reminders,
                        wishlist: wishlistReminders,
                        metadata: {
                            source: 'smart_reminders',
                            reminderCount: reminders?.length || 0
                        }
                    };

                case 'GET_LOYALTY_TIPS' as any:
                    const cartTotal = await this.getCartTotal(userId);
                    const loyaltyTips = await this.smartRemindersService.getLoyaltyOptimization(userId, cartTotal);
                    const occasionOffers = await this.smartRemindersService.getSpecialOccasionOffers(userId);
                    return {
                        success: true,
                        action: 'loyalty_tips',
                        message: 'Maximize your rewards!',
                        loyaltyTips,
                        occasionOffers,
                        metadata: {
                            source: 'loyalty_optimizer',
                            cartTotal
                        }
                    };

                case 'CHECK_PRICE_HISTORY' as any:
                    if (!payload.productId) throw new BadRequestException('Product ID required');
                    const priceChange = await this.priceTrackerService.trackPriceChange(payload.productId);
                    return {
                        success: true,
                        action: 'price_history',
                        message: 'Price history loaded!',
                        priceChange,
                        metadata: {
                            source: 'price_tracker',
                            productId: payload.productId
                        }
                    };

                case 'GET_COMPLEMENTS' as any:
                    if (!payload.productId) throw new BadRequestException('Product ID required');
                    const complements = await this.outfitRecommenderService.getComplementaryItems(payload.productId);
                    return {
                        success: true,
                        action: 'get_complements',
                        message: `Found ${complements?.length || 0} items that pair well!`,
                        complements,
                        metadata: {
                            source: 'outfit_recommender',
                            baseProductId: payload.productId
                        }
                    };

                case BowActionType.APPLY_COUPON:
                    // Future: Integrate with coupon service
                    return {
                        success: false,
                        message: 'Coupon application coming soon!'
                    };

                default:
                    throw new BadRequestException(`Action ${action} not supported yet`);
            }

            // Log successful action with metadata
            await this.logActionExecution(userId, action, payload, result ?? userMessage, success);

            return {
                success,
                action,
                data: result,
                message: userMessage,
                metadata: {
                    executedAt: new Date(),
                    userId
                }
            };
        } catch (error) {
            this.logger.error(`Action execution failed: ${error.message}`, error.stack);

            // Log failed action
            await this.logActionExecution(userId, action, payload, error.message, false);

            throw error;
        }
    }

    /**
     * Execute multiple chained actions (for complex scenarios)
     */
    async executeActionChain(userId: string, actions: BowActionExecuteDto[]) {
        const results = [];

        for (const action of actions) {
            try {
                const result = await this.executeAction(userId, action);
                results.push({ action: action.action, status: 'success', result });
            } catch (error) {
                this.logger.warn(`Action chain interrupted at ${action.action}: ${error.message}`);
                results.push({ action: action.action, status: 'failed', error: error.message });
                // Don't break - continue with remaining actions
            }
        }

        return results;
    }

    /**
     * Get cart total for loyalty optimization
     */
    private async getCartTotal(userId: string): Promise<number> {
        try {
            const cart = await this.prisma.cart.findUnique({
                where: { userId },
                include: {
                    items: {
                        include: { product: true }
                    }
                }
            });

            if (!cart) return 0;

            return cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        } catch (error) {
            this.logger.error(`Failed to get cart total: ${error.message}`);
            return 0;
        }
    }

    /**
     * Log action execution for analytics
     */
    private async logActionExecution(
        userId: string,
        action: string,
        payload: any,
        result: any,
        success: boolean
    ) {
        try {
            await this.prisma.bowInteraction.create({
                data: {
                    userId,
                    sessionId: 'action-execution',
                    type: 'ACTION',
                    actionType: action as any,
                    actionPayload: payload,
                    response: success ? 'success' : result,
                    escalated: !success
                }
            });
        } catch (error) {
            this.logger.warn(`Failed to log action execution: ${error.message}`);
        }
    }
}
