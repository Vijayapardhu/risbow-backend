import { Injectable, Logger } from '@nestjs/common';
import { BowIntent } from './dto/bow.dto';
import { BowActionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BowIntentService {
    private readonly logger = new Logger(BowIntentService.name);

    constructor(private prisma: PrismaService) { }

    async detectIntent(text: string, context?: any): Promise<BowIntent> {
        const cleanText = text.toLowerCase().trim();

        // 1. Explicit Action: ADD TO CART
        // Check if user is requesting to add (not stating they already added)
        if (this.matches(cleanText, ['add', 'buy', 'purchase', 'get']) &&
            !this.matches(cleanText, ['added', 'bought', 'just added', 'already', 'purchased'])) {

            // Extract product keywords from the query
            const productQuery = this.extractProductQuery(cleanText);

            // Try to find the product
            const product = await this.findProductByQuery(productQuery);

            return {
                intent: BowActionType.ADD_TO_CART,
                confidence: product ? 0.95 : 0.9,
                entities: {
                    productId: product?.id,
                    quantity: this.extractQuantity(cleanText),
                    query: productQuery // Keep query for fallback
                }
            };
        }

        // 2. Explicit Action: COUPON
        if (this.matches(cleanText, ['coupon', 'code', 'discount', 'promo', 'offer'])) {
            // If asking generally "do i have coupons", trigger smart search
            if (this.matches(cleanText, ['do i have', 'any', 'my', 'check', 'find', 'search', 'avail'])) {
                return {
                    intent: 'FIND_BEST_COUPON' as any, // Cast as generic
                    confidence: 0.95,
                    entities: { payload: {} }
                };
            }

            // Otherwise, if specific code provided
            const code = this.extractCouponCode(cleanText);
            if (code) {
                return {
                    intent: BowActionType.APPLY_COUPON,
                    confidence: 0.95,
                    entities: { payload: { code } }
                };
            }
        }

        // 3. View Cart Intent
        if (this.matches(cleanText, ['show', 'view', 'see', 'check', 'what', 'display']) &&
            this.matches(cleanText, ['cart', 'my cart', 'shopping cart', 'basket'])) {
            return {
                intent: BowActionType.VIEW_CART,
                confidence: 0.95,
                entities: {}
            };
        }

        // 4. Navigation & App Control
        if (this.matches(cleanText, ['go to', 'show me', 'open', 'take me to', 'navigate'])) {
            if (cleanText.includes('cart')) return this.controlIntent('NAVIGATE', { route: 'Cart' });
            if (cleanText.includes('order')) return this.controlIntent('NAVIGATE', { route: 'Orders' });
            if (cleanText.includes('profile')) return this.controlIntent('NAVIGATE', { route: 'Profile' });
            if (cleanText.includes('home')) return this.controlIntent('NAVIGATE', { route: 'Home' });
            if (cleanText.includes('checkout')) return this.controlIntent('NAVIGATE', { route: 'Checkout' });
            if (cleanText.includes('wishlist')) return this.controlIntent('NAVIGATE', { route: 'Wishlist' });
            if (cleanText.includes('coupon') || cleanText.includes('offer')) return this.controlIntent('OPEN_DRAWER', { type: 'COUPONS' });
        }

        // 5. Get Recommendations
        if (this.matches(cleanText, ['recommend', 'suggest', 'what should i', 'any ideas', 'similar', 'goes with', 'match'])) {
            return {
                intent: BowActionType.GET_RECOMMENDATIONS,
                confidence: 0.9,
                entities: { query: cleanText }
            };
        }

        // 6. Search Intent
        if (this.matches(cleanText, ['find', 'search', 'look for', 'looking for', 'show', 'need']) &&
            !this.matches(cleanText, ['cart'])) {
            return {
                intent: 'SEARCH',
                confidence: 0.85,
                entities: { query: this.extractSearchQuery(cleanText) }
            };
        }

        // 7. Cart Operations
        if (this.matches(cleanText, ['remove', 'delete']) && this.matches(cleanText, ['cart'])) {
            return {
                intent: BowActionType.REMOVE_FROM_CART,
                confidence: 0.9,
                entities: {}
            };
        }

        // 8. Default: CHAT or SEARCH
        // If question or greeting -> CHAT
        // If user is sharing information (added, bought, etc.) -> CHAT
        if (cleanText.split(' ').length < 3 && ['hi', 'hello', 'hey', 'sup', 'yo', 'woof'].includes(cleanText)) {
            return { intent: 'CHAT', confidence: 1.0, entities: {} };
        }

        // If user is telling us they did something (acknowledgment)
        if (this.matches(cleanText, ['added', 'bought', 'just', 'already', 'i have', 'i got', 'purchased'])) {
            return { intent: 'CHAT', confidence: 0.9, entities: {} };
        }

        // Help/Questions
        if (this.matches(cleanText, ['help', 'what can', 'how do', 'can you', 'tell me'])) {
            return { intent: 'CHAT', confidence: 0.95, entities: {} };
        }

        // Default to search if contains meaningful words
        if (cleanText.split(' ').length >= 2) {
            return {
                intent: 'SEARCH',
                confidence: 0.6,
                entities: { query: cleanText }
            };
        }

        return { intent: 'CHAT', confidence: 0.5, entities: {} };
    }

    private matches(text: string, keywords: string[]): boolean {
        return keywords.some(k => text.includes(k));
    }

    private extractQuantity(text: string): number {
        const match = text.match(/\b(\d+)\b/);
        return match ? parseInt(match[1], 10) : 1;
    }

    private extractCouponCode(text: string): string | undefined {
        // Look for patterns like "code ABC123" or "coupon SAVE20"
        const patterns = [
            /code\s+([A-Z0-9]+)/i,
            /coupon\s+([A-Z0-9]+)/i,
            /promo\s+([A-Z0-9]+)/i,
            /apply\s+([A-Z0-9]+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1].toUpperCase();
        }

        return undefined;
    }

    private extractSearchQuery(text: string): string {
        // Remove common intent keywords to get clean query
        let cleaned = text
            .replace(/\b(find|search|look for|looking for|show|show me|need|get me)\b/gi, '')
            .trim();

        // Remove common prefixes like "for the", "the", "a", "an"
        cleaned = cleaned
            .replace(/^(show\s+me\s+)/i, '')
            .replace(/^(for\s+the\s+|the\s+|for\s+|a\s+|an\s+)/i, '')
            .replace(/^(me\s+|all\s+)/i, '')
            .trim();

        return cleaned || text;
    }

    private extractProductQuery(text: string): string {
        // Remove action keywords to get product description
        const cleaned = text
            .replace(/\b(add|buy|purchase|get|to|my|cart|the)\b/gi, '')
            .trim();

        return cleaned || text;
    }

    private async findProductByQuery(query: string): Promise<{ id: string; title: string } | null> {
        try {
            // Clean the query
            const cleanQuery = query.trim().toLowerCase();

            // First try: Exact or partial title/description match
            let products = await this.prisma.product.findMany({
                where: {
                    OR: [
                        { title: { contains: cleanQuery, mode: 'insensitive' } },
                        { description: { contains: cleanQuery, mode: 'insensitive' } }
                    ],
                    isActive: true
                },
                take: 1,
                select: {
                    id: true,
                    title: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (products.length > 0) {
                this.logger.log(`Found product: ${products[0].title} (${products[0].id}) for query: "${query}"`);
                return products[0];
            }

            // Second try: Search by category name
            products = await this.prisma.product.findMany({
                where: {
                    Category: {
                        name: { contains: cleanQuery, mode: 'insensitive' }
                    },
                    isActive: true
                },
                take: 1,
                select: {
                    id: true,
                    title: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (products.length > 0) {
                this.logger.log(`Found product by category: ${products[0].title} (${products[0].id}) for query: "${query}"`);
                return products[0];
            }

            // Third try: Split query into words and search each
            const words = cleanQuery.split(/\s+/).filter(w => w.length > 2);
            // Filter out generic words that match too broadly
            const skipWords = ['all', 'any', 'the', 'best', 'good', 'nice', 'kind', 'type', 'some', 'every'];
            const meaningfulWords = words.filter(w => !skipWords.includes(w));

            if (meaningfulWords.length > 0) {
                for (const word of meaningfulWords) {
                    products = await this.prisma.product.findMany({
                        where: {
                            OR: [
                                { title: { contains: word, mode: 'insensitive' } },
                                { Category: { name: { contains: word, mode: 'insensitive' } } }
                            ],
                            isActive: true
                        },
                        take: 1,
                        select: {
                            id: true,
                            title: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    });

                    if (products.length > 0) {
                        this.logger.log(`Found product by word "${word}": ${products[0].title} (${products[0].id}) for query: "${query}"`);
                        return products[0];
                    }
                }
            }

            this.logger.log(`No product found for query: "${query}"`);
            return null;
        } catch (error) {
            this.logger.error(`Product search error: ${error.message}`);
            return null;
        }
    }

    private controlIntent(type: string, params: any): BowIntent {
        return {
            intent: BowActionType.CLIENT_CONTROL,
            confidence: 0.95,
            entities: { payload: { type, params } }
        };
    }
}
