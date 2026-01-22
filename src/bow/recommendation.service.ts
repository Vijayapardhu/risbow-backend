
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CartSnapshot {
    cartValue: number;
    itemCount: number;
    categories: string[];
    priceDistribution: Record<string, number>;
    isGiftEligible: boolean;
    isFreeShippingClose: boolean;
    cartPattern: string;
}

@Injectable()
export class RecommendationService {
    private readonly logger = new Logger(RecommendationService.name);

    constructor(private prisma: PrismaService) { }

    // 1️⃣ Analyze Cart State
    async analyzeCart(userId: string): Promise<CartSnapshot | null> {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: { items: { include: { product: { include: { category: true } } } } }
        });

        if (!cart || cart.items.length === 0) return null;

        const cartValue = cart.items.reduce((sum, item) => sum + (item.product.offerPrice || item.product.price) * item.quantity, 0);
        const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const categories = [...new Set(cart.items.map(i => i.product.category?.name || 'Uncategorized'))];

        // Simple logic for pattern - can be enhanced
        let cartPattern = 'SINGLE_ITEM_CART';
        if (itemCount > 3) cartPattern = 'BUNDLE_POTENTIAL_CART';
        if (cartValue > 5000) cartPattern = 'VALUE_BUYER_CART';

        // Saving Insight for Analytics
        await this.prisma.cartInsight.create({
            data: {
                userId,
                cartValue,
                itemCount,
                categories,
                cartPattern,
                hesitationScore: 0.0, // Placeholder for real logic
                abandonRisk: 0.0
            }
        });

        return {
            cartValue,
            itemCount,
            categories,
            priceDistribution: {},
            isGiftEligible: cartValue > 2000,
            isFreeShippingClose: cartValue > 400 && cartValue < 500, // Example logic
            cartPattern
        };
    }

    // 2️⃣ Generate Recommendations
    async getRecommendations(userId: string, snapshot: CartSnapshot) {
        // Strategy C: Threshold Push
        if (snapshot.isFreeShippingClose) {
            const diff = 500 - snapshot.cartValue;
            const fillers = await this.prisma.product.findMany({
                where: {
                    isActive: true,
                    price: { lte: diff + 100, gte: diff } // Slightly flexible
                },
                take: 2
            });
            if (fillers.length > 0) {
                await this.logRecommendation(userId, 'THRESHOLD', fillers.map(p => p.id), snapshot.cartValue);
                return {
                    type: 'THRESHOLD',
                    message: `Add ₹${diff} more for FREE shipping!`,
                    products: fillers
                };
            }
        }

        // Strategy D: Risk Reassurance (Hesitant User)
        if (snapshot.cartPattern === 'HESITANT_CART') {
            // Logic: Recommend lower price alternative or reassurance
            // For MVP: Reassurance message + No products (or similar cheaper products)
            // Let's find a cheaper alternative to the most expensive item in cart
            return {
                type: 'RISK',
                message: `Not sure? Don't worry, we offer easy 7-day returns on all these items!`,
                products: []
            };
        }

        // Strategy B: Complete the Look (Fashion)
        if (snapshot.cartPattern === 'LOOK_POTENTIAL_CART' || (snapshot.categories.includes('Fashion'))) {
            // Logic: Find complementary items. e.g. Shirt -> Jeans
            const mainCategory = snapshot.categories[0];
            let targetCategory = '';
            if (mainCategory.includes('Shirt') || mainCategory.includes('Top')) targetCategory = 'Jeans';
            else if (mainCategory.includes('Jeans') || mainCategory.includes('Pants')) targetCategory = 'Shirt';
            else targetCategory = 'Shoes';

            const complements = await this.prisma.product.findMany({
                where: {
                    isActive: true,
                    category: { name: { contains: targetCategory, mode: 'insensitive' } }
                },
                take: 2
            });

            if (complements.length > 0) {
                await this.logRecommendation(userId, 'LOOK', complements.map(p => p.id), snapshot.cartValue);
                return {
                    type: 'LOOK',
                    message: `Complete the look with these ${targetCategory}:`,
                    products: complements
                };
            }
        }

        // Strategy A: Frequently Bought Together (Mock logic: Recommend same category accessories)
        if (snapshot.cartPattern === 'SINGLE_ITEM_CART') {
            const mainCategory = snapshot.categories[0];
            const accessories = await this.prisma.product.findMany({
                where: {
                    isActive: true,
                    category: { name: { equals: mainCategory, mode: 'insensitive' } },
                    price: { lte: 1000 } // Cheaper add-ons
                },
                take: 2
            });
            if (accessories.length > 0) {
                await this.logRecommendation(userId, 'BUNDLE', accessories.map(p => p.id), snapshot.cartValue);
                return {
                    type: 'BUNDLE',
                    message: `People who buy ${mainCategory} items usually buy these:`,
                    products: accessories
                };
            }
        }

        return null;
    }

    private async logRecommendation(userId: string, strategy: string, productIds: string[], cartValue: number) {
        await this.prisma.recommendationEvent.create({
            data: {
                userId,
                source: 'BOW',
                strategy,
                productIds,
                cartValueBefore: cartValue
            }
        });
    }
}
