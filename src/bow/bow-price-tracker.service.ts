import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PriceAlert {
    productId: string;
    title: string;
    currentPrice: number;
    previousPrice: number;
    priceChange: number;
    percentChange: number;
    alertType: 'price_drop' | 'price_rise' | 'back_in_stock' | 'flash_deal';
    message: string;
}

export interface DealInfo {
    productId: string;
    title: string;
    originalPrice: number;
    dealPrice: number;
    discountPercent: number;
    dealEndTime?: Date;
    dealType: 'flash_sale' | 'clearance' | 'bundle' | 'seasonal';
}

@Injectable()
export class BowPriceTracker {
    private readonly logger = new Logger(BowPriceTracker.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Track price changes for a product
     */
    async trackPriceChange(productId: string): Promise<PriceAlert | null> {
        try {
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
                select: {
                    id: true,
                    title: true,
                    price: true,
                    offerPrice: true
                }
            });

            if (!product) return null;

            // Use offerPrice as discounted price, or base price
            const currentPrice = product.offerPrice || product.price;
            const previousPrice = product.price; // Base price as reference

            if (previousPrice === currentPrice) {
                return null; // No discount
            }

            const priceChange = currentPrice - previousPrice;
            const percentChange = Math.round((Math.abs(priceChange) / previousPrice) * 100);

            const alertType: PriceAlert['alertType'] = currentPrice < previousPrice ? 'price_drop' : 'price_rise';

            const alert: PriceAlert = {
                productId,
                title: product.title,
                currentPrice,
                previousPrice,
                priceChange,
                percentChange,
                alertType,
                message: `${Math.abs(percentChange)}% ${alertType === 'price_drop' ? 'OFF' : 'increase'}!`
            };

            this.logger.log(`Price alert: ${product.title} - ${alert.message}`);
            return alert;
        } catch (error) {
            this.logger.error(`Error tracking price: ${error.message}`);
            return null;
        }
    }

    /**
     * Find best deals based on discount percentage
     */
    async findBestDeals(limit: number = 10): Promise<DealInfo[]> {
        try {
            const deals = await this.prisma.product.findMany({
                where: {
                    isActive: true,
                    offerPrice: {
                        not: null,
                        lt: 999999
                    }
                },
                select: {
                    id: true,
                    title: true,
                    price: true,
                    offerPrice: true,
                    Category: { select: { name: true } }
                },
                orderBy: { offerPrice: 'asc' },
                take: limit * 3
            });

            const dealsWithDiscounts: DealInfo[] = [];

            for (const product of deals) {
                if (product.offerPrice && product.offerPrice < product.price) {
                    const discount = product.price - product.offerPrice;
                    const discountPercent = Math.round((discount / product.price) * 100);

                    if (discountPercent >= 10) { // At least 10% discount
                        dealsWithDiscounts.push({
                            productId: product.id,
                            title: product.title,
                            originalPrice: product.price,
                            dealPrice: product.offerPrice,
                            discountPercent,
                            dealType: discountPercent > 50 ? 'clearance' : 'flash_sale'
                        } as any);
                    }
                }
            }

            return dealsWithDiscounts
                .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
                .slice(0, limit);
        } catch (error) {
            this.logger.error(`Error finding best deals: ${error.message}`);
            return [];
        }
    }

    /**
     * Find deals in specific category
     */
    async findDealsInCategory(categoryId: string, limit: number = 5): Promise<DealInfo[]> {
        try {
            const deals = await this.prisma.product.findMany({
                where: {
                    categoryId,
                    isActive: true
                },
                select: {
                    id: true,
                    title: true,
                    price: true,
                    offerPrice: true
                },
                orderBy: { price: 'asc' },
                take: limit * 2
            });

            const dealsWithDiscounts: DealInfo[] = [];

            for (const product of deals) {
                // Use offerPrice for discounts (if offerPrice is less than price)
                const originalPrice = product.price;
                const dealPrice = product.offerPrice || product.price;

                if (originalPrice > dealPrice) {
                    const discount = originalPrice - dealPrice;
                    const discountPercent = Math.round((discount / originalPrice) * 100);

                    if (discountPercent >= 5) {
                        dealsWithDiscounts.push({
                            productId: product.id,
                            title: product.title,
                            originalPrice,
                            dealPrice,
                            discountPercent,
                            dealType: 'flash_sale'
                        });
                    }
                }
            }

            return dealsWithDiscounts.slice(0, limit);
        } catch (error) {
            this.logger.error(`Error finding category deals: ${error.message}`);
            return [];
        }
    }

    /**
     * Get deal hunting recommendations
     */
    async getDealHuntingRecommendations(userId: string): Promise<any[]> {
        try {
            // Get user's interested categories from purchase history
            const orders = await this.prisma.order.findMany({
                where: { userId },
                select: { items: true },
                take: 5
            });

            const categoryIds = new Set<string>();
            
            // Extract categories from Order.items (JSON field)
            for (const order of orders) {
                if (Array.isArray(order.items)) {
                    for (const item of order.items) {
                        const itemData = item as any;
                        if (itemData.categoryId) {
                            categoryIds.add(itemData.categoryId);
                        }
                    }
                }
            }

            // Find deals in those categories
            const allDeals: DealInfo[] = [];
            for (const catId of Array.from(categoryIds).slice(0, 3)) {
                const deals = await this.findDealsInCategory(catId, 3);
                allDeals.push(...deals);
            }

            return allDeals
                .sort((a, b) => b.discountPercent - a.discountPercent)
                .slice(0, 5);
        } catch (error) {
            this.logger.error(`Error getting deal hunting recommendations: ${error.message}`);
            return [];
        }
    }

    /**
     * Generate price alert message
     */
    private generatePriceAlertMessage(
        title: string,
        previousPrice: number,
        currentPrice: number,
        percentChange: number
    ): string {
        if (currentPrice < previousPrice) {
            return `🎉 ${title} dropped by ₹${previousPrice - currentPrice} (${Math.abs(percentChange)}% OFF)!`;
        } else {
            return `📈 ${title} increased by ₹${currentPrice - previousPrice} (${percentChange}% increase).`;
        }
    }
}

// Import for Prisma
import { Prisma } from '@prisma/client';
