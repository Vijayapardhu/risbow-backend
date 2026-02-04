
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartIntelligenceService } from './cart-intelligence.service';
import { CartInsightType, InsightSeverity } from '@prisma/client';
import { randomUUID } from 'crypto';

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

    // Money is always paise
    private readonly FREE_SHIPPING_THRESHOLD = 100000; // ₹1000
    private readonly GIFT_ELIGIBILITY_THRESHOLD = 200000; // ₹2000

    constructor(
        private prisma: PrismaService,
        private cartIntel: CartIntelligenceService,
    ) { }

    // 1️⃣ Analyze Cart State
    async analyzeCart(userId: string): Promise<CartSnapshot | null> {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: { CartItem: { include: { Product: { include: { Category: true } } } } }
        });

        if (!cart || cart.CartItem.length === 0) return null;

        const cartValue = cart.CartItem.reduce((sum, item) => sum + (item.Product.offerPrice || item.Product.price) * item.quantity, 0);
        const itemCount = cart.CartItem.reduce((sum, item) => sum + item.quantity, 0);
        const categories = [...new Set(cart.CartItem.map(i => i.Product.Category?.name || 'Uncategorized'))];

        // Price distribution buckets (paise)
        const buckets = { LT_500: 0, BETWEEN_500_2000: 0, GT_2000: 0 } as Record<string, number>;
        for (const item of cart.CartItem) {
            const unit = item.Product.offerPrice || item.Product.price;
            const subtotal = unit * item.quantity;
            if (unit < 50000) buckets.LT_500 += subtotal;
            else if (unit <= 200000) buckets.BETWEEN_500_2000 += subtotal;
            else buckets.GT_2000 += subtotal;
        }

        // Pattern classification (paise)
        let cartPattern = 'SINGLE_ITEM_CART';
        if (itemCount >= 3) cartPattern = 'BUNDLE_POTENTIAL_CART';
        if (cartValue >= 500000) cartPattern = 'VALUE_BUYER_CART'; // >= ₹5000

        // Generate real-time cart signals and store as CartInsight (append-only)
        const signals = await this.cartIntel.analyzeCart(userId);
        const sevWeight = (s: InsightSeverity) => s === 'HIGH' ? 1.0 : s === 'MEDIUM' ? 0.6 : 0.3;
        const hesitationScore = Math.min(1, signals.filter(s => s.type === CartInsightType.HESITATION || s.type === CartInsightType.REPEAT_REMOVAL).reduce((a, s) => a + sevWeight(s.severity), 0));
        const abandonRisk = Math.min(1, signals.reduce((a, s) => a + (s.type === CartInsightType.HESITATION ? 0.25 : s.type === CartInsightType.REPEAT_REMOVAL ? 0.35 : 0.05) * sevWeight(s.severity), 0));

        for (const s of signals) {
            await this.prisma.cartInsight.create({
                data: {
                    id: randomUUID(),
                    userId,
                    cartValue,
                    itemCount,
                    categories,
                    cartPattern,
                    hesitationScore,
                    abandonRisk,
                    type: s.type,
                    severity: s.severity,
                }
            }).catch(() => undefined);
        }

        return {
            cartValue,
            itemCount,
            categories,
            priceDistribution: buckets,
            isGiftEligible: cartValue >= this.GIFT_ELIGIBILITY_THRESHOLD,
            isFreeShippingClose: cartValue >= (this.FREE_SHIPPING_THRESHOLD - 30000) && cartValue < this.FREE_SHIPPING_THRESHOLD, // within ₹300
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
                    Category: { name: { contains: targetCategory, mode: 'insensitive' } }
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
                    Category: { name: { equals: mainCategory, mode: 'insensitive' } },
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
                id: randomUUID(),
                userId,
                source: 'BOW',
                strategy,
                productIds,
                cartValueBefore: cartValue
            }
        });
    }
}
