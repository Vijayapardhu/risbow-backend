import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BowIntentService } from './bow-intent.service';
import { BowContextService } from './bow-context.service';
import { BowPolicyService } from './bow-policy.service';
import { BowActionService } from './bow-action.service';
import { BowSessionService } from './bow-session.service';
import { BowNLPService } from './bow-nlp.service';
import { BowOptimizationService } from './bow-optimization.service';
import { BowRecommendationEngine } from './bow-recommendation.service';
import { BowPriceTracker } from './bow-price-tracker.service';
import { BowSmartReminders } from './bow-smart-reminders.service';

@Injectable()
export class BowService {
    private readonly logger = new Logger(BowService.name);

    constructor(
        private prisma: PrismaService,
        private intentService: BowIntentService,
        private contextService: BowContextService,
        private policyService: BowPolicyService,
        private actionService: BowActionService,
        private sessionService: BowSessionService,
        private nlpService: BowNLPService,
        private optimizationService: BowOptimizationService,
        private bowRecommendationEngine: BowRecommendationEngine,
        private priceTrackerService: BowPriceTracker,
        private outfitRecommenderService: BowOutfitRecommender,
        private smartRemindersService: BowSmartReminders,
        private recommendationService: RecommendationService
    ) {
        setInterval(() => this.sessionService.cleanupExpiredSessions(), 10 * 60 * 1000);
    }

    async processMessage(userId: string, dto: BowMessageDto): Promise<BowResponse> {
        try {
            this.logger.log(`Processing message for user ${userId}: ${dto.message}`);
            this.logger.log(`Context received: ${JSON.stringify(dto.context)}`);
            // 1. Detect intent
            const intent = await this.intentService.detectIntent(dto.message, dto.context);
            // 2. Build context
            const context = await this.contextService.buildContext(userId, dto.context);
            // 3. Route intent
            if (intent.intent === BowActionType.ADD_TO_CART && intent.entities.productId) {
                const cartService = (this.contextService as any).cartService;
                await cartService.addItem(userId, {
                    productId: intent.entities.productId,
                    variantId: intent.entities.variantId,
                    quantity: intent.entities.quantity || 1
                });
                return { message: 'Product added to cart.' };
            }
            if (intent.intent === BowActionType.REMOVE_FROM_CART && intent.entities.productId) {
                const cartService = (this.contextService as any).cartService;
                // Find the cart item for this product/variant
                const cart = await cartService.getCart(userId);
                const item = cart.items.find((i: any) => i.productId === intent.entities.productId && (!intent.entities.variantId || i.variantId === intent.entities.variantId));
                if (item) {
                    await cartService.removeItem(userId, item.id);
                    return { message: 'Product removed from cart.' };
                } else {
                    return { message: 'Product not found in cart.' };
                }
            }
            if (intent.intent === 'VIEW_CART') {
                return await this.handleViewCart(userId);
            }
            if (intent.intent === 'GET_RECOMMENDATIONS') {
                return await this.handleGetRecommendations(userId, context);
            }
            if (intent.intent === 'SEARCH' && intent.entities.query) {
                const products = await this.searchProducts(intent.entities.query);
                if (products.length === 0) {
                    await this.logProductSearchMiss(intent.entities.query, userId);

                    // Smart Fallback: Check if we can map the query to a category
                    const category = this.nlpService.mapKeywordToCategory(intent.entities.query);
                    if (category) {
                        const relatedProducts = await this.getProductsByCategory(category);
                        return {
                            message: `${intent.entities.query} not available. More on ${category} are these:`,
                            products: relatedProducts
                        };
                    }

                    // Explicit Fallback Logic (Trending)
                    const trending = await this.getTrendingProducts();
                    return {
                        message: `I couldn't find any exact matches for "${intent.entities.query}". Here are some popular items you might like:`,
                        products: trending
                    };
                }
                return { message: `Found ${products.length} products for "${intent.entities.query}"`, products };
            }
            if (intent.intent === 'CHAT') {
                return { message: 'How can I help you today?' };
            }
            // Fallback: try search
            if (intent.entities.query) {
                const products = await this.searchProducts(intent.entities.query);
                if (products.length === 0) {
                    await this.logProductSearchMiss(intent.entities.query, userId);

                    // Smart Fallback: Check if we can map the query to a category
                    const category = this.nlpService.mapKeywordToCategory(intent.entities.query);
                    if (category) {
                        const relatedProducts = await this.getProductsByCategory(category);
                        return {
                            message: `${intent.entities.query} not available. More on ${category} are these:`,
                            products: relatedProducts
                        };
                    }

                    const trending = await this.getTrendingProducts();
                    return {
                        message: `I couldn't find any exact matches for "${intent.entities.query}". Here are some popular items you might like:`,
                        products: trending
                    };
                }
                return { message: `Found ${products.length} products for "${intent.entities.query}"`, products };
            }
            return { message: 'Sorry, I could not understand your request.' };
        } catch (error) {
            this.logger.error(`Error processing message: ${error.message}`, error.stack);
            return { message: 'Internal error occurred.' };
        }
    }

    private async handleChatIntent(userId: string, dto: BowMessageDto, intent: any, context: any, nlpParsed?: any): Promise<BowResponse> {
        return { message: 'Chat intent handling not implemented.' };
    }

    private detectOccasion(message: string): string {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('formal') || lowerMsg.includes('office') || lowerMsg.includes('meeting')) return 'formal';
        if (lowerMsg.includes('party') || lowerMsg.includes('celebration') || lowerMsg.includes('night')) return 'party';
        if (lowerMsg.includes('sport') || lowerMsg.includes('gym') || lowerMsg.includes('active')) return 'sports';
        return 'casual';
    }

    private isConfirmationResponse(message: string): boolean {
        const lowerMsg = message.toLowerCase().trim();
        const confirmationWords = [
            'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay',
            'confirm', 'proceed', 'go ahead', 'do it', 'yes please',
            'yes add', 'add it', 'add that', 'correct', 'right',
            'absolutely', 'definitely', 'of course'
        ];
        return confirmationWords.some(word =>
            lowerMsg === word || lowerMsg.startsWith(word + ' ') || lowerMsg.endsWith(' ' + word)
        );
    }

    private async handleActionIntent(userId: string, dto: BowMessageDto, intent: any, context: any, nlpParsed?: any, sessionId?: string): Promise<BowResponse> {
        return { message: 'Action intent handling not implemented.' };
    }

    private async searchProductByKeywords(query: string) {
        return this.searchProducts(query);
    }

    private async searchProducts(query: string): Promise<BowProduct[]> {
        const normalized = normalizeText(query);
        // Split by whitespace and filter empty strings
        let keywords = removeStopwords(normalized).split(/\s+/).filter(w => w.length > 0);

        // Protection: If no meaningful keywords remain (e.g. "is it in stock"), return empty to trigger fallback
        if (keywords.length === 0) {
            return [];
        }

        // Expand with synonyms using NLP service
        const expandedQueries = this.nlpService.expandQueryWithSynonyms(keywords.join(' '));
        // We can search for the original keywords AND the expanded variations
        // For simplicity, we'll collect all unique words from expansions
        for (const q of expandedQueries) {
            const extraWords = q.split(/\s+/);
            for (const w of extraWords) {
                if (!keywords.includes(w)) keywords.push(w);
            }
        }

        let products = await this.prisma.product.findMany({
            where: {
                OR: keywords.map((kw) => ({
                    OR: [
                        { title: { contains: kw, mode: 'insensitive' } },
                        { description: { contains: kw, mode: 'insensitive' } },
                        { category: { name: { contains: kw, mode: 'insensitive' } } }
                    ]
                })),
                isActive: true
            },
            take: 20,
            include: { category: { select: { name: true } } }
        });

        // Deduplicate by id
        const seen = new Set();
        products = products.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });

        return products.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.offerPrice || p.price,
            images: p.images,
            category: p.category ? { name: p.category.name } : undefined,
            description: p.description,
            stock: p.stock,
            vendorId: p.vendorId
        }));
    }

    private async getProductsByCategory(categoryName: string): Promise<BowProduct[]> {
        const products = await this.prisma.product.findMany({
            where: {
                isActive: true,
                stock: { gt: 0 },
                OR: [
                    { category: { name: { contains: categoryName, mode: 'insensitive' } } },
                    { category: { parent: { name: { contains: categoryName, mode: 'insensitive' } } } }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { category: { select: { name: true } } }
        });

        return products.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.offerPrice || p.price,
            images: p.images,
            category: p.category ? { name: p.category.name } : undefined,
            description: p.description,
            stock: p.stock,
            vendorId: p.vendorId
        }));
    }

    private async getTrendingProducts(): Promise<BowProduct[]> {
        const products = await this.prisma.product.findMany({
            where: { isActive: true, stock: { gt: 0 } },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { category: { select: { name: true } } }
        });

        return products.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.offerPrice || p.price,
            images: p.images,
            category: p.category ? { name: p.category.name } : undefined,
            description: p.description,
            stock: p.stock,
            vendorId: p.vendorId
        }));
    }

    private async searchProductsAdvanced(query: string, nlpParsed?: any) {
        // Try normal search first
        let products = await this.searchProducts(query);
        if (products.length) return products;
        // If NLP parsed, try synonyms/expanded queries
        if (nlpParsed && nlpParsed.expandedQueries) {
            for (const q of nlpParsed.expandedQueries) {
                products = await this.searchProducts(q);
                if (products.length) return products;
            }
        }
        // Fallback: split query and search each word
        const words = query.split(' ').filter(w => w.length > 2);
        for (const word of words) {
            products = await this.searchProducts(word);
            if (products.length) return products;
        }
        return [];
    }

    private async getRecommendations(userId: string, context: any) {
        const cartService = (this.contextService as any).cartService;
        const cart = await cartService.getCart(userId);
        let recs = [];
        // 1. Complementary categories (not in cart)
        if (cart && cart.items.length) {
            const cartProductIds = cart.items.map((i: any) => i.productId);
            const cartCategories = [...new Set(cart.items.map((i: any) => String(i.product.categoryId)))] as string[];
            // Find categories not in cart but popular
            const popularCategories = await this.prisma.product.groupBy({
                by: ['categoryId'],
                where: { isActive: true, stock: { gt: 0 }, categoryId: { notIn: cartCategories } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 2
            });
            const complementaryCategoryIds = popularCategories.map((c) => c.categoryId);
            // Recommend from complementary categories
            recs = await this.prisma.product.findMany({
                where: {
                    categoryId: { in: complementaryCategoryIds },
                    isActive: true,
                    stock: { gt: 0 }
                },
                orderBy: { createdAt: 'desc' },
                take: 3,
                include: { category: { select: { name: true } } }
            });
            // Also recommend from cart categories, not in cart
            const more = await this.prisma.product.findMany({
                where: {
                    categoryId: { in: cartCategories },
                    id: { notIn: cartProductIds },
                    isActive: true,
                    stock: { gt: 0 }
                },
                orderBy: { stock: 'desc' },
                take: 2,
                include: { category: { select: { name: true } } }
            });
            recs = recs.concat(more);
        }
        // 2. User purchase history (top categories)
        if (recs.length < 5) {
            const orders = await this.prisma.order.findMany({
                where: { userId },
                select: { items: true }
            });
            const categoryCount: Record<string, number> = {};
            for (const order of orders) {
                try {
                    let items: any[] = [];
                    if (Array.isArray(order.items)) {
                        items = order.items;
                    } else if (typeof order.items === 'string') {
                        items = JSON.parse(order.items);
                    }
                    for (const item of items) {
                        if (item.categoryId) categoryCount[item.categoryId] = (categoryCount[item.categoryId] || 0) + 1;
                    }
                } catch { }
            }
            const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([cat]) => cat);
            if (topCategories.length) {
                const more = await this.prisma.product.findMany({
                    where: { categoryId: { in: topCategories }, isActive: true, stock: { gt: 0 } },
                    orderBy: { createdAt: 'desc' },
                    take: 2,
                    include: { category: { select: { name: true } } }
                });
                recs = recs.concat(more);
            }
        }
        // 3. Fallback: trending products
        if (!recs.length) {
            recs = await this.prisma.product.findMany({
                where: { isActive: true, stock: { gt: 0 } },
                orderBy: [{ stock: 'desc' }, { createdAt: 'desc' }],
                take: 5,
                include: { category: { select: { name: true } } }
            });
        }
        // Deduplicate by id
        const seen = new Set();
        recs = recs.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });
        return recs.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.offerPrice || p.price,
            images: p.images,
            category: p.category ? { name: p.category.name } : undefined,
            description: p.description,
            stock: p.stock,
            vendorId: p.vendorId
        }));
    }

    private async getProductDetails(productId: string) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { category: { select: { name: true } } }
        });
        if (!product) return null;
        return {
            id: product.id,
            title: product.title,
            price: product.offerPrice || product.price,
            images: product.images,
            category: product.category ? { name: product.category.name } : undefined,
            description: product.description,
            stock: product.stock,
            vendorId: product.vendorId
        };
    }

    async executeAction(userId: string, dto: BowActionExecuteDto) {
        return { message: 'Execute action not implemented.' };
    }

    private async handleViewCart(userId: string, sessionId?: string): Promise<BowResponse> {
        // Use cartService to get cart
        const cartService = (this.contextService as any).cartService;
        const cart = await cartService.getCart(userId);
        if (!cart || !cart.items.length) {
            return { message: 'Your cart is empty.' };
        }
        return {
            message: `You have ${cart.totalItems} items in your cart.`,
            products: cart.items.map((item: any) => ({
                id: item.productId,
                title: item.product.title,
                price: item.price,
                images: item.product.images,
                category: item.product.category ? { name: item.product.category.name } : undefined,
                description: item.product.description,
                stock: item.stock,
                vendorId: item.product.vendorId
            }))
        };
    }

    private async handleCartAnalytics(userId: string, sessionId: string): Promise<BowResponse> {
        const cartService = (this.contextService as any).cartService;
        const cart = await cartService.getCart(userId);
        const freeShippingThreshold = 1000;
        if (!cart || !cart.items.length) return { message: 'Your cart is empty.' };
        const toFreeShipping = Math.max(0, freeShippingThreshold - cart.totalAmount);
        // Cart value, item count, category diversity
        const totalItems = cart.totalItems;
        const totalAmount = cart.totalAmount;
        const categories = [...new Set(cart.items.map((i: any) => String(i.product.categoryId)))] as string[];
        // Potential savings (dummy: 10% if over 2000)
        let savings = 0;
        if (totalAmount > 2000) savings = Math.floor(totalAmount * 0.1);
        let message = `Cart value: ₹${totalAmount}, Items: ${totalItems}, Categories: ${categories.length}.`;
        if (savings > 0) message += ` You save ₹${savings} on this order!`;
        if (toFreeShipping === 0) {
            message += ' You have qualified for free shipping!';
        } else {
            message += ` Add items worth ₹${toFreeShipping} more to get FREE shipping!`;
        }
        return { message };
    }

    private async handleGetRecommendations(userId: string, context: any): Promise<BowResponse> {
        // 1. Analyze Cart
        const snapshot = await this.recommendationService.analyzeCart(userId);

        // 2. Get Strategic Recommendations
        let strategyRecs = null;
        if (snapshot) {
            strategyRecs = await this.recommendationService.getRecommendations(userId, snapshot);
        }

        if (strategyRecs) {
            return {
                message: strategyRecs.message,
                products: strategyRecs.products.map(p => ({
                    id: p.id,
                    title: p.title,
                    price: p.offerPrice || p.price,
                    description: p.description,
                    images: p.images,
                    stock: p.stock
                }))
            };
        }

        // Fallback to old logic if no strategic recs (e.g. empty cart)
        const recs = await this.getTrendingProducts(); // Reuse trending as generic fallback
        if (!recs.length) return { message: 'No recommendations available right now.' };
        return {
            message: `Here are some popular items for you:`,
            products: recs
        };
    }

    private getActionLabel(type: BowActionType): string {
        switch (type) {
            case BowActionType.ADD_TO_CART: return "Add to Cart";
            case BowActionType.APPLY_COUPON: return "Apply Code";
            case BowActionType.NAVIGATE: return "Go There";
            default: return "Confirm";
        }
    }

    private async logInteraction(userId: string, query: string, intent: any, response: string) {
        // Log to ProductSearchMiss if not found
        if (response && response.startsWith('No products found')) {
            await this.logProductSearchMiss(query, userId);
        }
        // Could log to BowInteraction table if needed
    }
    // --- Add full implementation for not-found logging ---
    private async logProductSearchMiss(query: string, userId: string) {
        try {
            const normalized = normalizeText(query);
            const inferredCategory = this.nlpService.mapKeywordToCategory(query);

            // Using findFirst + update/create because normalizedQuery might not be unique constraint in DB yet 
            // (although I added index, I removed @unique from 'query', so I must handle it manually to be safe)
            const existing = await this.prisma.productSearchMiss.findFirst({
                where: { normalizedQuery: normalized }
            });

            if (existing) {
                await this.prisma.productSearchMiss.update({
                    where: { id: existing.id },
                    data: {
                        count: { increment: 1 },
                        lastSearchedAt: new Date(),
                        keywords: removeStopwords(normalized).split(' ')
                    }
                });
            } else {
                await this.prisma.productSearchMiss.create({
                    data: {
                        query,
                        normalizedQuery: normalized,
                        keywords: removeStopwords(normalized).split(' '),
                        userId,
                        count: 1,
                        metadata: { inferredCategoryName: inferredCategory }
                    }
                });
            }
        } catch (error) {
            this.logger.error(`Failed to log search miss: ${error.message}`);
        }
    }
}
