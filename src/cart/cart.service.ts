import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { AddCartItemDto, UpdateCartItemDto, SyncCartDto } from './dto/cart.dto';
import { Prisma } from '@prisma/client';
import { EcommerceEventsService } from '../recommendations/ecommerce-events.service';
import { UserProductEventType } from '@prisma/client';

@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);

    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
        private events: EcommerceEventsService,
    ) { }

    // 🔐 P0 FIX: PROPER REDIS CART LOCKING
    private async lockCart(userId: string): Promise<boolean> {
        if (!this.redis) throw new Error('RedisService not injected');
        const key = `cart:lock:${userId}`;

        // Use SETNX (SET if Not eXists) for atomic lock acquisition
        const locked = await this.redis.setnx(key, '1');

        if (locked) {
            // Set expiry to prevent deadlocks (10 seconds)
            await this.redis.expire(key, 10);
            return true;
        }

        return false;
    }

    private async unlockCart(userId: string): Promise<void> {
        if (!this.redis) throw new Error('RedisService not injected');
        const key = `cart:lock:${userId}`;
        await this.redis.del(key);
    }

    private async getCartWithItems(userId: string) {
        return this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                vendor: true,
                                variants: true,
                                // Assuming images are in mediaGallery or similar, keeping simple for now
                            }
                        },
                        // If we had a Variation relation, we'd include it here.
                        // Currently CartItem has variantId but no relation in schema provided in audit?
                        // Let's check schema again. Schema says: 
                        // variantId String? 
                        // But NO relation to ProductVariation model in CartItem. 
                        // This means we have to manually fetch variation if needed or rely on ID.
                        // Ideally there SHOULD be a relation. I'll stick to manual fetch for stock check.
                    }
                }
            }
        });
    }

    async getCart(userId: string) {
        let cart = await this.getCartWithItems(userId);

        if (!cart) {
            // Lazy creation
            return {
                id: null,
                items: [],
                totalAmount: 0,
                totalItems: 0
            };
        }

        // Calculate totals dynamically (Server as Source of Truth)
        // Note: This logic assumes we can fetch variant details if variantId is present.
        // Since schema doesn't link CartItem -> ProductVariation, we might need a separate query 
        // OR update schema. For now, I will fetch variations in a separate step or 
        // assume base product price if no variant. 
        // ACTUALLY, strict requirements say "Price is always fetched from product variant".
        // I must handle this.

        const enrichedItems = await Promise.all(cart.items.map(async (item) => {
            let price = item.product.price;
            let stock = item.product.stock;
            // No need to redeclare title/image if unused or use item.product directly

            // JSON Variant Handling
            if (item.variantId) {
                const variants = ((item.product as any).variants as any[]) || [];
                const variant = variants.find(v => v.id === item.variantId);

                if (variant) {
                    price = (variant.price ?? null) !== null ? Number(variant.price) : price;
                    stock = Number(variant.stock);
                }
            } else if (item.product.offerPrice) {
                price = item.product.offerPrice;
            }

            return {
                ...item,
                price,
                subtotal: price * item.quantity,
                stock,
                isStockAvailable: stock >= item.quantity
            };
        }));

        const totalAmount = enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);
        const totalItems = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);

        return {
            id: cart.id,
            items: enrichedItems,
            totalAmount,
            totalItems
        };
    }

    private validateQuantityRules(product: any, quantity: number) {
        // 1. Min Order Quantity
        if (quantity < product.minOrderQuantity) {
            throw new BadRequestException(`Minimum order quantity is ${product.minOrderQuantity}`);
        }

        // 2. Max Allowed Quantity
        if (quantity > product.totalAllowedQuantity) {
            throw new BadRequestException(`Maximum allowed quantity is ${product.totalAllowedQuantity}`);
        }

        // 3. Step Size
        // Logic: (Qty - MOQ) should be divisible by Step Size
        // e.g. MOQ=2, Step=1 -> 2,3,4... OK
        // e.g. MOQ=10, Step=5 -> 10, 15, 20... OK. 12 is (12-10)=2. 2%5 != 0.
        const remainder = (quantity - product.minOrderQuantity) % product.quantityStepSize;
        if (remainder !== 0) {
            throw new BadRequestException(`Quantity must be in steps of ${product.quantityStepSize} starting from ${product.minOrderQuantity}`);
        }
    }

    private getVariant(product: any, variantId?: string) {
        if (!variantId) return null;
        const variants = (product.variants as any[]) || [];
        return variants.find(v => v.id === variantId);
    }

    async addItem(userId: string, dto: AddCartItemDto) {
        // 🔐 P0 FIX: Acquire cart lock to prevent race conditions
        const locked = await this.lockCart(userId);
        if (!locked) {
            throw new BadRequestException('Cart is being modified. Please retry.');
        }

        try {
            const { productId, variantId, quantity } = dto;

            // 1. Verify Product & Variant + Stock
            const product = await this.prisma.product.findUnique({ where: { id: productId } });
            if (!product) throw new NotFoundException('Product not found');

            // Validation Rules
            this.validateQuantityRules(product, quantity);

            let price = product.offerPrice || product.price;
            let availableStock = product.stock;

            // JSON Variation Logic
            if (variantId) {
                const variant = this.getVariant(product, variantId);
                if (!variant) throw new NotFoundException('Variant not found');

                // Checking if variant belongs is implicit by look up in product.variants
                price = variant.offerPrice || variant.price || variant.sellingPrice || price; // Fallback structure
                availableStock = variant.stock;
            }

            if (availableStock < quantity) {
                throw new BadRequestException(`Insufficient stock. Available: ${availableStock}`);
            }

            // 2. Upsert Cart
            let cart = await this.prisma.cart.findUnique({ where: { userId } });
            if (!cart) {
                cart = await this.prisma.cart.create({ data: { userId } });
            }

            // 3. Check existing item
            const existingItem = await this.prisma.cartItem.findFirst({
                where: {
                    cartId: cart.id,
                    productId,
                    variantId: variantId || null
                }
            });

            if (existingItem) {
                const newQuantity = existingItem.quantity + quantity;

                // Re-validate rules for merged quantity? 
                // Usually step size applies to TOTAL.
                this.validateQuantityRules(product, newQuantity);

                if (availableStock < newQuantity) {
                    throw new BadRequestException(`Insufficient stock for total quantity. Available: ${availableStock}`);
                }
                await this.prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: { quantity: newQuantity }
                });
            } else {
                await this.prisma.cartItem.create({
                    data: {
                        cartId: cart.id,
                        productId,
                        variantId,
                        quantity
                    }
                });
            }

            // Commerce event stream (best-effort; does not affect cart correctness)
            this.events.track({
                userId,
                type: UserProductEventType.ADD_TO_CART,
                source: 'CART',
                productId,
                variantId: variantId || undefined,
                quantity,
                price,
            }).catch(() => undefined);

            // --- ENTERPRISE: Cart Intelligence ---
            this.updateCartInsights(userId, cart.id, product.categoryId).catch(err =>
                this.logger.error(`Insight Error: ${err.message}`)
            );
            // -------------------------------------

            return this.getCart(userId);
        } finally {
            // 🔐 P0 FIX: Always release lock
            await this.unlockCart(userId);
        }
    }

    async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
        // 🔐 P0 FIX: Acquire cart lock to prevent race conditions
        const locked = await this.lockCart(userId);
        if (!locked) {
            throw new BadRequestException('Cart is being modified. Please retry.');
        }

        try {
            const cart = await this.prisma.cart.findUnique({ where: { userId } });
            if (!cart) throw new NotFoundException('Cart not found');

            const item = await this.prisma.cartItem.findUnique({
                where: { id: itemId },
                include: { product: true }
            });

            if (!item || item.cartId !== cart.id) {
                throw new NotFoundException('Cart item not found');
            }

            // Validate Rules
            this.validateQuantityRules(item.product, dto.quantity);

            // Stock Validation
            let availableStock = item.product.stock;

            if (item.variantId) {
                const variant = this.getVariant(item.product, item.variantId);
                if (variant) availableStock = variant.stock;
            }

            if (availableStock < dto.quantity) {
                throw new BadRequestException(`Insufficient stock. Available: ${availableStock}`);
            }

            await this.prisma.cartItem.update({
                where: { id: itemId },
                data: { quantity: dto.quantity }
            });

            // --- ENTERPRISE: Cart Intelligence ---
            this.updateCartInsights(userId, cart.id, item.product.categoryId).catch(err =>
                this.logger.error(`Insight Error: ${err.message}`)
            );
            // -------------------------------------

            return this.getCart(userId);
        } finally {
            // 🔐 P0 FIX: Always release lock
            await this.unlockCart(userId);
        }
    }

    async removeItem(userId: string, itemId: string) {
        // 🔐 P0 FIX: Acquire cart lock to prevent race conditions
        const locked = await this.lockCart(userId);
        if (!locked) {
            throw new BadRequestException('Cart is being modified. Please retry.');
        }

        try {
            const cart = await this.prisma.cart.findUnique({ where: { userId } });
            if (!cart) throw new NotFoundException('Cart not found');

            // Verify ownership indirectly by checking cartId matches
            const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
            if (!item || item.cartId !== cart.id) {
                throw new NotFoundException('Cart item not found');
            }

            await this.prisma.cartItem.delete({ where: { id: itemId } });

            this.events.track({
                userId,
                type: UserProductEventType.REMOVE_FROM_CART,
                source: 'CART',
                productId: item.productId,
                variantId: item.variantId || undefined,
                quantity: item.quantity,
            }).catch(() => undefined);

            // --- ENTERPRISE: Cart Intelligence ---
            // item.product might be unavailable if we didn't fetch it before delete, 
            // but item verification fetched it? No, findUnique item only. 
            // Need to check line 251. It does NOT include product.
            // So updateCartInsights only gets cartId. 
            this.updateCartInsights(userId, cart.id).catch(err =>
                this.logger.error(`Insight Error: ${err.message}`)
            );
            // -------------------------------------

            return this.getCart(userId);
        } finally {
            // 🔐 P0 FIX: Always release lock
            await this.unlockCart(userId);
        }
    }

    async clearCart(userId: string) {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (cart) {
            await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
        return { message: 'Cart cleared' };
    }

    async syncCart(userId: string, dto: SyncCartDto) {
        // 1. Get or Create Cart
        let cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart) {
            cart = await this.prisma.cart.create({ data: { userId } });
        }

        // 2. Process items
        for (const itemDto of dto.items) {
            try {
                const product = await this.prisma.product.findUnique({ where: { id: itemDto.productId } });
                if (!product) continue;

                let stock = product.stock;
                if (itemDto.variantId) {
                    const variant = this.getVariant(product, itemDto.variantId);
                    if (!variant) continue;
                    stock = variant.stock;
                }

                if (stock < 1) continue;

                // Rules Check (Silent correction or Skip?)
                // Sync usually implies "Take my local state".
                // We should validate. If invalid, maybe we snap to nearest valid or skip?
                // Rules: MOQ enforced. Step enforced.
                // Let's standardise: if Qty < MOQ, set to MOQ? If > Stock, set to Stock?
                // Simplest: If invalid, SKIP.

                if (itemDto.quantity < product.minOrderQuantity) continue;
                if (itemDto.quantity > product.totalAllowedQuantity) continue;
                const remainder = (itemDto.quantity - product.minOrderQuantity) % product.quantityStepSize;
                if (remainder !== 0) continue;

                // Cap at stock
                const quantity = Math.min(itemDto.quantity, stock);

                const existing = await this.prisma.cartItem.findFirst({
                    where: {
                        cartId: cart.id,
                        productId: itemDto.productId,
                        variantId: itemDto.variantId || null
                    }
                });

                if (existing) {
                    await this.prisma.cartItem.update({
                        where: { id: existing.id },
                        data: { quantity: quantity }
                    });
                } else {
                    await this.prisma.cartItem.create({
                        data: {
                            cartId: cart.id,
                            productId: itemDto.productId,
                            variantId: itemDto.variantId,
                            quantity: quantity
                        }
                    });
                }

            } catch (e) {
                this.logger.error(`Failed to sync item ${itemDto.productId}: ${e.message}`);
            }
        }

        return this.getCart(userId);
    }

    // --- ENTERPRISE: Cart Intelligence Engine ---
    private async updateCartInsights(userId: string, cartId: string, currentActionCategoryId?: string) {
        try {
            const cart = await this.prisma.cart.findUnique({
                where: { id: cartId },
                include: { items: { include: { product: true } } }
            });

            if (!cart || cart.items.length === 0) return;

            const totalValue = cart.items.reduce((sum, item) => sum + (item.product.offerPrice || item.product.price) * item.quantity, 0);
            const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

            // Analyze Categories
            const categories = [...new Set(cart.items.map(i => i.product.categoryId))];

            // Determine Pattern
            let pattern = 'NORMAL';
            if (itemCount === 1) pattern = 'SINGLE_ITEM';
            else if (totalValue > 10000) pattern = 'HIGH_VALUE';
            else if (categories.length > 2) pattern = 'VARIETY_SHOPPER';
            else if (categories.length === 1 && itemCount > 2) pattern = 'FOCUSED_BUYER';
            else if (itemCount > 5) pattern = 'BULK_POTENTIAL';

            // Calculate Hesitation (minutes since last insight)
            const lastInsight = await (this.prisma as any).cartInsight.findFirst({
                where: { userId },
                orderBy: { triggeredAt: 'desc' }
            });

            let hesitationScore = 0;
            if (lastInsight) {
                const diffMs = Date.now() - (lastInsight as any).triggeredAt.getTime();
                hesitationScore = diffMs / (1000 * 60);
            }

            // Calculate Abandon Risk (0.0 to 1.0)
            let risk = 0.1;
            if (hesitationScore > 10) risk += 0.3;
            if (hesitationScore > 30) risk += 0.4;
            if (totalValue > 5000) risk += 0.2;
            if (pattern === 'SINGLE_ITEM') risk += 0.1;

            await (this.prisma as any).cartInsight.create({
                data: {
                    userId,
                    cartValue: totalValue,
                    itemCount,
                    categories,
                    cartPattern: pattern,
                    hesitationScore,
                    abandonRisk: Math.min(risk, 1.0),
                    type: 'HESITATION',
                    severity: risk > 0.7 ? 'HIGH' : risk > 0.4 ? 'MEDIUM' : 'LOW',
                    metadata: currentActionCategoryId ? { currentActionCategoryId } : undefined,
                }
            });

            if (risk > 0.7) {
                this.logger.warn(`High Abandon Risk (${risk}) detected for User ${userId}`);
            }
        } catch (error) {
            this.logger.error('Cart Insight Failed', error?.stack || String(error));
        }
    }

    /**
     * Public method to add item to cart (used by BuyLaterService)
     */
    async addItemPublic(userId: string, dto: AddCartItemDto): Promise<any> {
        return this.addItem(userId, dto);
    }
}
