import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface ReplenishmentReminder {
    productId: string;
    title: string;
    price: number;
    reason: string;
    nextPurchaseDate?: Date;
}

export interface WishlistItem {
    productId: string;
    title: string;
    price: number;
    addedDate: Date;
    priceDropAlert: boolean;
}

export interface LoyaltyOptimization {
    message: string;
    action: string;
    pointsWorth: number;
    recommendedPayment?: string;
}

@Injectable()
export class BowSmartReminders {
    private readonly logger = new Logger(BowSmartReminders.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Get auto-replenishment reminders for consumables
     */
    async getReplenishmentReminders(userId: string): Promise<ReplenishmentReminder[]> {
        try {
            // Find frequently purchased items
            const orders = await this.prisma.order.findMany({
                where: { userId },
                select: { items: true },
                orderBy: { createdAt: 'desc' },
                take: 20
            });

            const productPurchaseCount = new Map<string, number>();

            // Count purchases from Order.items (JSON field)
            orders.forEach(order => {
                if (Array.isArray(order.items)) {
                    order.items.forEach((item: any) => {
                        const key = item.productId;
                        productPurchaseCount.set(key, (productPurchaseCount.get(key) || 0) + 1);
                    });
                }
            });

            const reminders: ReplenishmentReminder[] = [];

            // Get products frequently purchased
            const frequentProductIds = Array.from(productPurchaseCount.entries())
                .filter(([, count]) => count >= 2)
                .map(([id]) => id)
                .slice(0, 10);

            if (frequentProductIds.length === 0) return [];

            const products = await this.prisma.product.findMany({
                where: { id: { in: frequentProductIds } },
                select: {
                    id: true,
                    title: true,
                    price: true,
                    Category: { select: { name: true } }
                }
            });

            const consumableCategories = ['Groceries', 'Beauty', 'Toiletries', 'Medications', 'Supplies'];

            for (const product of products) {
                const count = productPurchaseCount.get(product.id) || 0;
                if (consumableCategories.some(cat => product.Category?.name?.includes(cat))) {
                    reminders.push({
                        productId: product.id,
                        title: product.title,
                        price: product.price,
                        reason: `You've bought this ${count} times before. Time to restock? 🛒`,
                        nextPurchaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    });
                }
            }

            this.logger.log(`Generated ${reminders.length} replenishment reminders for user ${userId}`);
            return reminders.slice(0, 5);
        } catch (error) {
            this.logger.error(`Error getting replenishment reminders: ${error.message}`);
            return [];
        }
    }

    /**
     * Manage smart wishlist
     */
    async addToSmartWishlist(userId: string, productId: string, enablePriceAlert: boolean = true): Promise<WishlistItem> {
        try {
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
                select: { id: true, title: true, price: true }
            });

            if (!product) {
                throw new Error('Product not found');
            }

            // Add to wishlist
            await this.prisma.wishlist.upsert({
                where: {
                    userId_productId: { userId, productId }
                },
                update: {},
                create: { id: randomUUID(), userId, productId }
            });

            this.logger.log(`Added ${productId} to smart wishlist for user ${userId}`);

            return {
                productId,
                title: product.title,
                price: product.price,
                addedDate: new Date(),
                priceDropAlert: enablePriceAlert
            };
        } catch (error) {
            this.logger.error(`Error adding to smart wishlist: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get wishlist with price drop alerts
     */
    async getSmartWishlist(userId: string): Promise<WishlistItem[]> {
        try {
            const wishlistItems = await this.prisma.wishlist.findMany({
                where: { userId },
                select: {
                    productId: true,
                    createdAt: true,
                    Product: {
                        select: {
                            id: true,
                            title: true,
                            price: true,
                            offerPrice: true,
                            createdAt: true
                        }
                    }
                }
            });

            if (!wishlistItems.length) return [];

            const items: WishlistItem[] = [];

            for (const item of wishlistItems) {
                if (item.Product) {
                    // Check if price dropped (offerPrice < price)
                    const priceDropped = (item.Product.offerPrice || 0) < (item.Product.price || 0);

                    items.push({
                        productId: item.Product.id,
                        title: item.Product.title,
                        price: item.Product.price,
                        addedDate: item.createdAt,
                        priceDropAlert: priceDropped
                    });
                }
            }

            // Sort: price drops first
            items.sort((a, b) => {
                if (a.priceDropAlert && !b.priceDropAlert) return -1;
                if (!a.priceDropAlert && b.priceDropAlert) return 1;
                return 0;
            });

            return items;
        } catch (error) {
            this.logger.error(`Error getting smart wishlist: ${error.message}`);
            return [];
        }
    }

    /**
     * Get loyalty and rewards optimization tips
     */
    async getLoyaltyOptimization(userId: string, cartValue: number): Promise<LoyaltyOptimization[]> {
        try {
            const optimizations: LoyaltyOptimization[] = [];

            // Example: Loyalty points optimization
            const pointsPerRupee = 1;
            const pointsWorth = Math.floor(cartValue * pointsPerRupee);

            // Milestone-based suggestions
            if (pointsWorth >= 100) {
                optimizations.push({
                    message: `🎁 You'll earn ${pointsWorth} loyalty points on this purchase!`,
                    action: 'earn_points',
                    pointsWorth
                });
            }

            // Payment method optimization
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    coinsBalance: true
                }
            });

            if (user && user.coinsBalance > 0) {
                optimizations.push({
                    message: `💰 You have ${user.coinsBalance} coins available! Use them for discounts.`,
                    action: 'use_coins',
                    pointsWorth: user.coinsBalance,
                    recommendedPayment: 'coins'
                });
            }

            // Referral bonus suggestion
            if (pointsWorth > 500) {
                optimizations.push({
                    message: `👥 Share your referral code to earn ₹100 per friend!`,
                    action: 'share_referral',
                    pointsWorth: 0
                });
            }

            return optimizations;
        } catch (error) {
            this.logger.error(`Error getting loyalty optimization: ${error.message}`);
            return [];
        }
    }

    /**
     * Get birthday/anniversary special offers
     */
    async getSpecialOccasionOffers(userId: string): Promise<any[]> {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    dateOfBirth: true,
                    id: true
                }
            });

            if (!user || !user.dateOfBirth) return [];

            const today = new Date();
            const dob = new Date(user.dateOfBirth);

            // Check if birthday is within next 7 days
            const daysUntilBirthday = this.daysUntilDate(dob);

            if (daysUntilBirthday >= 0 && daysUntilBirthday <= 7) {
                const giftSuggestions = await this.prisma.product.findMany({
                    where: {
                        isActive: true,
                        Category: {
                            name: { in: ['Electronics', 'Accessories', 'Fashion'] }
                        }
                    },
                    take: 3,
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: true
                    }
                });

                return [{
                    occasion: 'birthday',
                    message: `🎉 Happy Birthday coming up! ${100 - daysUntilBirthday * 10}% off gift items!`,
                    products: giftSuggestions
                }];
            }

            return [];
        } catch (error) {
            this.logger.error(`Error getting special occasion offers: ${error.message}`);
            return [];
        }
    }

    /**
     * Helper: Calculate days until a date
     */
    private daysUntilDate(targetDate: Date): number {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);

        // Get next occurrence of the date
        if (target.getMonth() < today.getMonth() ||
            (target.getMonth() === today.getMonth() && target.getDate() < today.getDate())) {
            target.setFullYear(target.getFullYear() + 1);
        }

        const diff = target.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    /**
     * Get viewed items with "don't forget" reminders
     */
    async getViewedItemReminders(userId: string, daysAgo: number = 3): Promise<any[]> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

            const interactions = await this.prisma.bowInteraction.findMany({
                where: {
                    userId,
                    createdAt: { gte: cutoffDate }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            });

            // Extract product IDs from interactions metadata
            const productIds = new Set<string>();
            interactions.forEach(interaction => {
                if (interaction.metadata && typeof interaction.metadata === 'object') {
                    const meta = interaction.metadata as any;
                    if (meta.productId) {
                        productIds.add(meta.productId);
                    }
                }
            });

            if (productIds.size === 0) return [];

            const products = await this.prisma.product.findMany({
                where: { id: { in: Array.from(productIds) } },
                select: {
                    id: true,
                    title: true,
                    price: true,
                    images: true
                },
                take: 5
            });

            return products.map(p => ({
                ...p,
                reminderMessage: `You viewed this ${daysAgo} days ago - Still interested? 👀`
            }));
        } catch (error) {
            this.logger.error(`Error getting viewed item reminders: ${error.message}`);
            return [];
        }
    }
}
