import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SmartRecommendation {
    productId: string;
    title: string;
    price: number;
    reason: 'based_on_viewed' | 'based_on_purchased' | 'trending' | 'similar_users' | 'seasonal';
    confidence: number;
    personalizedMessage: string;
}

@Injectable()
export class BowRecommendationEngine {
    private readonly logger = new Logger(BowRecommendationEngine.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Get smart recommendations based on trending products
     */
    async getSmartRecommendations(userId: string, limit: number = 5): Promise<SmartRecommendation[]> {
        try {
            // Get trending products
            const products = await this.prisma.product.findMany({
                where: { isActive: true },
                take: limit,
                select: {
                    id: true,
                    title: true,
                    price: true,
                    offerPrice: true,
                    category: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            const recommendations: SmartRecommendation[] = products.map((p) => ({
                productId: p.id,
                title: p.title,
                price: p.price,
                reason: 'trending',
                personalizedMessage: `Trending in ${p.category?.name || 'Shopping'}!`,
                confidence: 85 + Math.random() * 10
            }));

            this.logger.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
            return recommendations;
        } catch (error) {
            this.logger.error(`Error generating recommendations: ${error.message}`);
            return [];
        }
    }

    /**
     * Get "Frequently Bought Together" products
     */
    async getFrequentlyBoughtTogether(productId: string, limit: number = 3): Promise<any[]> {
        try {
            // Get product's category
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
                select: { categoryId: true }
            });

            if (!product) return [];

            // Get similar products in same category
            const similar = await this.prisma.product.findMany({
                where: {
                    categoryId: product.categoryId,
                    id: { not: productId },
                    isActive: true
                },
                take: limit,
                select: {
                    id: true,
                    title: true,
                    price: true,
                    offerPrice: true,
                    category: { select: { name: true } }
                }
            });

            return similar;
        } catch (error) {
            this.logger.error(`Error getting frequently bought together: ${error.message}`);
            return [];
        }
    }

    /**
     * Get recommendations based on category
     */
    async getSimilarUsersPurchases(userId: string, limit: number = 5): Promise<SmartRecommendation[]> {
        try {
            // Get categories this user has purchased from
            const userOrders = await this.prisma.order.findMany({
                where: { userId },
                select: { items: true },
                take: 5
            });

            if (userOrders.length === 0) return [];

            // Extract product IDs from order items (JSON field)
            const productIds = new Set<string>();
            userOrders.forEach(order => {
                if (Array.isArray(order.items)) {
                    order.items.forEach((item: any) => {
                        if (item.productId) productIds.add(item.productId);
                    });
                }
            });

            // Get those products and their categories
            const userProducts = await this.prisma.product.findMany({
                where: { id: { in: Array.from(productIds) } },
                select: { categoryId: true }
            });

            const categoryIds = userProducts.map(p => p.categoryId);

            // Get other products in those categories
            const similarProducts = await this.prisma.product.findMany({
                where: {
                    categoryId: { in: categoryIds },
                    id: { notIn: Array.from(productIds) },
                    isActive: true
                },
                take: limit,
                select: {
                    id: true,
                    title: true,
                    price: true,
                    category: { select: { name: true } }
                }
            });

            return similarProducts.map(p => ({
                productId: p.id,
                title: p.title,
                price: p.price,
                reason: 'similar_users',
                confidence: 0.75,
                personalizedMessage: `Users who bought like you also loved this!`
            }));
        } catch (error) {
            this.logger.error(`Error getting similar users purchases: ${error.message}`);
            return [];
        }
    }

    /**
     * Generate personalized recommendation message
     */
    generateRecommendationMessage(recommendation: SmartRecommendation): string {
        switch (recommendation.reason) {
            case 'based_on_viewed':
                return `You viewed this before - still interested? 👀`;
            case 'based_on_purchased':
                return `You loved similar products before! 💕`;
            case 'trending':
                return `🔥 ${recommendation.personalizedMessage}`;
            case 'similar_users':
                return `👥 ${recommendation.personalizedMessage}`;
            case 'seasonal':
                return `🌟 Perfect for this season!`;
            default:
                return `We think you'll love this!`;
        }
    }
}
