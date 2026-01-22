import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CartAnalytics {
    totalItems: number;
    totalValue: number;
    savings: number;
    freeShippingThreshold?: number;
    amountToFreeShipping?: number;
    suggestedBundles?: Array<{
        title: string;
        products: string[];
        savings: number;
    }>;
}

export interface OptimizationSuggestion {
    type: 'free_shipping' | 'bundle_deal' | 'coupon' | 'bulk_discount';
    message: string;
    action?: string;
    savings?: number;
}

@Injectable()
export class BowOptimizationService {
    private readonly logger = new Logger(BowOptimizationService.name);
    private readonly FREE_SHIPPING_THRESHOLD = 500; // ₹500

    constructor(private prisma: PrismaService) {}

    async analyzeCart(userId: string): Promise<CartAnalytics> {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                title: true,
                                price: true,
                                categoryId: true
                            }
                        }
                    }
                }
            }
        });

        if (!cart || cart.items.length === 0) {
            return {
                totalItems: 0,
                totalValue: 0,
                savings: 0
            };
        }

        const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = cart.items.reduce(
            (sum, item) => sum + (item.product.price * item.quantity), 
            0
        );

        const analytics: CartAnalytics = {
            totalItems,
            totalValue,
            savings: 0, // TODO: Calculate from coupons/discounts
            freeShippingThreshold: this.FREE_SHIPPING_THRESHOLD
        };

        if (totalValue < this.FREE_SHIPPING_THRESHOLD) {
            analytics.amountToFreeShipping = this.FREE_SHIPPING_THRESHOLD - totalValue;
        }

        return analytics;
    }

    async getOptimizationSuggestions(userId: string): Promise<OptimizationSuggestion[]> {
        const analytics = await this.analyzeCart(userId);
        const suggestions: OptimizationSuggestion[] = [];

        // Free shipping suggestion
        if (analytics.amountToFreeShipping && analytics.amountToFreeShipping > 0) {
            suggestions.push({
                type: 'free_shipping',
                message: `Add items worth ₹${analytics.amountToFreeShipping} more to get FREE shipping!`,
                action: 'recommend_cheap_items'
            });
        }

        // Bulk discount (if 3+ items of same category)
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: { select: { categoryId: true, price: true } }
                    }
                }
            }
        });

        if (cart) {
            const categoryCount = new Map<string, number>();
            cart.items.forEach(item => {
                const catId = item.product.categoryId;
                categoryCount.set(catId, (categoryCount.get(catId) || 0) + item.quantity);
            });

            for (const [catId, count] of categoryCount.entries()) {
                if (count >= 3) {
                    suggestions.push({
                        type: 'bulk_discount',
                        message: `You have ${count} items from the same category! Bulk discount may apply.`,
                        savings: Math.floor(analytics.totalValue * 0.1) // 10% savings
                    });
                }
            }
        }

        return suggestions;
    }

    async suggestComplementaryProducts(userId: string, limit: number = 3) {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                categoryId: true
                            }
                        }
                    }
                }
            }
        });

        if (!cart || cart.items.length === 0) {
            return [];
        }

        // Get categories from cart
        const cartCategories = [...new Set(cart.items.map(item => item.product.categoryId))];

        // Find complementary products from same categories not in cart
        const cartProductIds = cart.items.map(item => item.productId);
        
        const complementary = await this.prisma.product.findMany({
            where: {
                categoryId: { in: cartCategories },
                id: { notIn: cartProductIds },
                isActive: true,
                price: { lte: 500 } // Under ₹500 for easy addition
            },
            take: limit,
            select: {
                id: true,
                title: true,
                price: true,
                images: true,
                category: { select: { name: true } }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return complementary;
    }

    calculatePotentialSavings(cartValue: number, couponCode?: string): number {
        // TODO: Integrate with actual coupon service
        let savings = 0;

        // Example: 10% off on orders above ₹1000
        if (cartValue >= 1000) {
            savings = Math.floor(cartValue * 0.1);
        }

        return savings;
    }
}
