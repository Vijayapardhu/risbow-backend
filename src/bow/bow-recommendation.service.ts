import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EcommerceEventsService } from '../recommendations/ecommerce-events.service';
import { UserProductEventType, UserRole } from '@prisma/client';
import { BowLlmRerankerService } from './bow-llm-reranker.service';

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

    constructor(
        private prisma: PrismaService,
        private events: EcommerceEventsService,
        private reranker: BowLlmRerankerService,
    ) { }

    private formatINR(paise: number) {
        return `₹${Math.round(paise / 100)}`;
    }

    private getEffectivePrice(p: { offerPrice?: number | null; price: number }) {
        return (p.offerPrice ?? null) ? (p.offerPrice as number) : p.price;
    }

    /**
     * Get smart recommendations based on trending products
     */
    async getSmartRecommendations(userId: string, limit: number = 5): Promise<SmartRecommendation[]> {
        try {
            // 1) Build user context (cart + preference profile + recent events)
            const [cart, profile, recentViews, recentPurchases] = await Promise.all([
                this.prisma.cart.findUnique({
                    where: { userId },
                    include: {
                        CartItem: {
                            include: {
                                Product: { select: { id: true, categoryId: true, brandName: true, tags: true, price: true, offerPrice: true, stock: true, isActive: true, title: true } }
                            }
                        }
                    }
                }),
                (this.prisma as any).userPreferenceProfile.findUnique({ where: { userId } }).catch(() => null),
                (this.prisma as any).userProductEvent.findMany({
                    where: { userId, type: UserProductEventType.PRODUCT_VIEW },
                    orderBy: { createdAt: 'desc' },
                    take: 30,
                    select: { productId: true }
                }).catch(() => []),
                (this.prisma as any).userProductEvent.findMany({
                    where: { userId, type: UserProductEventType.PURCHASE },
                    orderBy: { createdAt: 'desc' },
                    take: 30,
                    select: { productId: true }
                }).catch(() => []),
            ]);

            const cartProductIds = new Set<string>((cart?.CartItem || []).map(i => String(i.productId)));
            const viewedIds: string[] = Array.from(new Set<string>(recentViews.map((e: any) => String(e.productId))))
                .filter((id) => !cartProductIds.has(id));
            const purchasedIds = new Set<string>(recentPurchases.map((e: any) => String(e.productId)));

            // 2) Candidate pools (commerce-style)
            const preferredCategoryIds: string[] = Array.isArray(profile?.preferredCategories) ? profile.preferredCategories : [];
            const cartCategoryIds = Array.from(new Set((cart?.CartItem || []).map(i => i.Product.categoryId).filter(Boolean)));
            const seedCategoryIds = Array.from(new Set([...preferredCategoryIds, ...cartCategoryIds])).slice(0, 6);

            // 2a) Trending (from event stream)
            const trendingIds = await this.events.getTrending(UserProductEventType.PRODUCT_VIEW, 30);

            // 2b) Category affinity candidates
            const categoryCandidates = seedCategoryIds.length
                ? await this.prisma.product.findMany({
                    where: {
                        isActive: true,
                        stock: { gt: 0 },
                        categoryId: { in: seedCategoryIds },
                        id: { notIn: Array.from(cartProductIds) },
                    },
                    take: 40,
                    select: { id: true, title: true, price: true, offerPrice: true, categoryId: true, brandName: true }
                })
                : [];

            // 2c) Recently viewed candidates (re-rank)
            const viewedCandidates = viewedIds.length
                ? await this.prisma.product.findMany({
                    where: { id: { in: viewedIds }, isActive: true, stock: { gt: 0 } },
                    take: 20,
                    select: { id: true, title: true, price: true, offerPrice: true, categoryId: true, brandName: true }
                })
                : [];

            // 2d) Trending products details
            const trendingCandidates = trendingIds.length
                ? await this.prisma.product.findMany({
                    where: { id: { in: trendingIds }, isActive: true, stock: { gt: 0 } },
                    take: 30,
                    select: { id: true, title: true, price: true, offerPrice: true, categoryId: true, brandName: true }
                })
                : [];

            // 3) Merge + score
            const byId = new Map<string, any>();
            const add = (arr: any[], reason: SmartRecommendation['reason']) => {
                for (const p of arr) {
                    if (cartProductIds.has(p.id)) continue;
                    if (purchasedIds.has(p.id)) continue; // avoid immediate repeats
                    const existing = byId.get(p.id);
                    byId.set(p.id, { ...p, _reasons: new Set([...(existing?._reasons || []), reason]) });
                }
            };

            add(viewedCandidates, 'based_on_viewed');
            add(categoryCandidates, 'similar_users');
            add(trendingCandidates, 'trending');

            const scored = Array.from(byId.values()).map((p: any) => {
                const reasons: Set<string> = p._reasons || new Set();
                const eff = this.getEffectivePrice(p);
                const discount = p.offerPrice ? Math.max(0, p.price - p.offerPrice) : 0;

                let score = 0;
                if (reasons.has('based_on_viewed')) score += 60;
                if (reasons.has('similar_users')) score += 35;
                if (reasons.has('trending')) score += 25;
                score += Math.min(20, Math.round(discount / 5000)); // +1 per ₹50 discount capped

                // Brand affinity (if profile stores brands)
                if (profile?.preferredBrands?.length && p.brandName && profile.preferredBrands.includes(p.brandName)) score += 15;

                // Price sensitivity: if HIGH, penalize high ticket items
                if (profile?.priceSensitivity === 'HIGH' && eff > 500000) score -= 20; // >₹5000

                return { p, score, effPrice: eff, discount, reasons: Array.from(reasons) };
            }).sort((a, b) => b.score - a.score);

            const top = scored.slice(0, limit);
            const recommendations: SmartRecommendation[] = top.map(({ p, score, reasons }) => {
                const reason = (reasons.includes('based_on_viewed') ? 'based_on_viewed' :
                    reasons.includes('trending') ? 'trending' :
                        reasons.includes('similar_users') ? 'similar_users' : 'trending') as SmartRecommendation['reason'];

                const eff = this.getEffectivePrice(p);

                return {
                    productId: p.id,
                    title: p.title,
                    price: eff,
                    reason,
                    confidence: Math.max(0.4, Math.min(0.95, score / 100)),
                    personalizedMessage:
                        reason === 'based_on_viewed'
                            ? 'You checked this recently — still interested?'
                            : reason === 'similar_users'
                                ? 'Based on your cart & preferences'
                                : 'Trending right now',
                };
            });

            // 4) Optional LLM rerank (safe fallback if not configured / fails)
            const ranked = await this.reranker.rerank(userId, recommendations.map((r) => ({
                id: r.productId,
                title: r.title,
                pricePaise: r.price,
                reasons: [r.reason],
            })));
            if (ranked && ranked.length) {
                const byId = new Map(recommendations.map((r) => [r.productId, r] as const));
                const reordered = ranked.map((id) => byId.get(id)).filter(Boolean) as SmartRecommendation[];
                // Preserve limit + fallbacks
                recommendations.splice(0, recommendations.length, ...reordered.slice(0, limit));
            }

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
                    Category: { select: { name: true } }
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
                    Category: { select: { name: true } }
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
    /**
     * Post-Search Hook: Analyzes search intent and prepares future recommendations
     */
    async afterSearch(userId: string | undefined, query: string) {
        if (!userId) return; // Anonymous search, no long-term tracking yet

        // 1. Log or Process Intent
        this.logger.log(`[Bow] Processing search context for user ${userId}: "${query}"`);

        // 2. We could preemptively fetch "Similar Category" products and cache them as "Next Recommendations"
        // For now, we just log. Real implementation would update a "UserInterestGraph".
    }
}
