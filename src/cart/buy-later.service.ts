import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToBuyLaterDto, UpdateBuyLaterDto, BuyLaterResponseDto } from './dto/buy-later.dto';
import { NotificationsService } from '../shared/notifications.service';
import { CartService } from './cart.service';
import { randomUUID } from 'crypto';

@Injectable()
export class BuyLaterService {
    private readonly logger = new Logger(BuyLaterService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private cartService: CartService
    ) {}

    /**
     * Add product to buy later list with target price
     */
    async addToBuyLater(userId: string, dto: AddToBuyLaterDto): Promise<BuyLaterResponseDto> {
        // Check if product exists and get current price
        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
            select: { id: true, price: true, offerPrice: true, title: true, isActive: true }
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (!product.isActive) {
            throw new BadRequestException('Product is not available');
        }

        const currentPrice = product.offerPrice || product.price;

        // Check if already in buy later list
        const existing = await this.prisma.buyLater.findFirst({
            where: {
                userId,
                productId: dto.productId,
                variantId: dto.variantId,
                isActive: true
            }
        });

        if (existing) {
            throw new BadRequestException('Product already in your buy later list');
        }

        const buyLater = await this.prisma.buyLater.create({
            data: {
                id: randomUUID(),
                variantId: dto.variantId,
                targetPrice: dto.targetPrice,
                currentPrice,
                quantity: dto.quantity || 1,
                updatedAt: new Date(),
                User: { connect: { id: userId } },
                Product: { connect: { id: dto.productId } }
            },
            include: {
                Product: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        offerPrice: true,
                        images: true,
                        isActive: true
                    }
                }
            }
        });

        this.logger.log(`Added product ${dto.productId} to buy later list for user ${userId} at target price ${dto.targetPrice}`);

        return this.formatBuyLaterResponse(buyLater);
    }

    /**
     * Get user's buy later list
     */
    async getBuyLaterList(userId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [buyLaterItems, total] = await Promise.all([
            this.prisma.buyLater.findMany({
                where: { userId, isActive: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    Product: {
                        select: {
                            id: true,
                            title: true,
                            price: true,
                            offerPrice: true,
                            images: true,
                            isActive: true,
                            vendor: {
                                select: { name: true }
                            }
                        }
                    }
                }
            }),
            this.prisma.buyLater.count({
                where: { userId, isActive: true }
            })
        ]);

        return {
            data: buyLaterItems.map(item => this.formatBuyLaterResponse(item)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Update buy later entry
     */
    async updateBuyLater(userId: string, buyLaterId: string, dto: UpdateBuyLaterDto): Promise<BuyLaterResponseDto> {
        const buyLater = await this.prisma.buyLater.findFirst({
            where: { id: buyLaterId, userId }
        });

        if (!buyLater) {
            throw new NotFoundException('Buy later entry not found');
        }

        const updated = await this.prisma.buyLater.update({
            where: { id: buyLaterId },
            data: {
                targetPrice: dto.targetPrice,
                quantity: dto.quantity,
                isActive: dto.isActive
            },
            include: {
                Product: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        offerPrice: true,
                        images: true,
                        isActive: true
                    }
                }
            }
        });

        return this.formatBuyLaterResponse(updated);
    }

    /**
     * Remove from buy later list
     */
    async removeFromBuyLater(userId: string, buyLaterId: string): Promise<void> {
        const buyLater = await this.prisma.buyLater.findFirst({
            where: { id: buyLaterId, userId }
        });

        if (!buyLater) {
            throw new NotFoundException('Buy later entry not found');
        }

        await this.prisma.buyLater.delete({
            where: { id: buyLaterId }
        });

        this.logger.log(`Removed buy later entry ${buyLaterId} for user ${userId}`);
    }

    /**
     * Check price drops and process notifications/cart additions
     * Called by cron job
     */
    async checkPriceDrops(): Promise<void> {
        this.logger.log('Checking for price drops in buy later items...');

        const buyLaterItems = await this.prisma.buyLater.findMany({
            where: {
                isActive: true,
                isNotified: false
            },
            include: {
                User: { select: { id: true, name: true, email: true, mobile: true } },
                Product: { select: { id: true, title: true, price: true, offerPrice: true, images: true } }
            }
        });

        for (const item of buyLaterItems) {
            const currentPrice = (item as any).Product.offerPrice || (item as any).Product.price;
            
            if (currentPrice <= item.targetPrice) {
                await this.processPriceDrop(item, currentPrice);
            } else {
                // Update current price for tracking
                await this.prisma.buyLater.update({
                    where: { id: item.id },
                    data: { currentPrice }
                });
            }
        }

        this.logger.log(`Price drop check completed. Processed ${buyLaterItems.length} items.`);
    }

    /**
     * Process price drop - send notification and add to cart
     */
    private async processPriceDrop(buyLaterItem: any, newPrice: number): Promise<void> {
        try {
            const priceDropPercent = ((buyLaterItem.currentPrice - newPrice) / buyLaterItem.currentPrice) * 100;

            // Send notification
            await this.notificationsService.createNotification(
                buyLaterItem.User.id,
                'Price Drop Alert!',
                `Great news! ${buyLaterItem.Product.title} has dropped by ${priceDropPercent.toFixed(1)}% to ₹${newPrice / 100}. We've added it to your cart!`,
                'PRICE_DROP',
                'BUY_LATER'
            );

            // Add to cart
            await this.cartService.addItemPublic(buyLaterItem.User.id, {
                productId: buyLaterItem.productId,
                variantId: buyLaterItem.variantId,
                quantity: buyLaterItem.quantity
            });

            // Update buy later entry
            await this.prisma.buyLater.update({
                where: { id: buyLaterItem.id },
                data: {
                    isNotified: true,
                    isAddedToCart: true,
                    priceDropPercent,
                    currentPrice: newPrice,
                    updatedAt: new Date()
                }
            });

            this.logger.log(`Price drop processed for item ${buyLaterItem.id}: ${priceDropPercent.toFixed(1)}% drop to ₹${newPrice / 100}`);
        } catch (error) {
            this.logger.error(`Failed to process price drop for item ${buyLaterItem.id}: ${error.message}`);
        }
    }

    /**
     * Format buy later response
     */
    private formatBuyLaterResponse(item: any): BuyLaterResponseDto {
        const product = item.Product || item.product;
        const currentPrice = product.offerPrice || product.price;
        const priceDropPercent = item.priceDropPercent || ((item.currentPrice - currentPrice) / item.currentPrice) * 100;

        return {
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            targetPrice: item.targetPrice,
            currentPrice,
            quantity: item.quantity,
            isActive: item.isActive,
            isNotified: item.isNotified,
            isAddedToCart: item.isAddedToCart,
            priceDropPercent: priceDropPercent > 0 ? priceDropPercent : undefined,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            product
        };
    }

    /**
     * Get statistics for buy later feature
     */
    async getBuyLaterStats(userId?: string): Promise<any> {
        const where = userId ? { userId } : {};

        const [total, active, notified, addedToCart] = await Promise.all([
            this.prisma.buyLater.count({ where }),
            this.prisma.buyLater.count({ where: { ...where, isActive: true } }),
            this.prisma.buyLater.count({ where: { ...where, isNotified: true } }),
            this.prisma.buyLater.count({ where: { ...where, isAddedToCart: true } })
        ]);

        return {
            total,
            active,
            notified,
            addedToCart,
            conversionRate: active > 0 ? ((addedToCart / active) * 100).toFixed(1) + '%' : '0%'
        };
    }
}