import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto, SyncCartDto } from './dto/cart.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);

    constructor(private prisma: PrismaService) { }

    private async getCartWithItems(userId: string) {
        return this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                vendor: true,
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
                const variants = (item.product.variants as any[]) || [];
                const variant = variants.find(v => v.id === item.variantId);
                
                if (variant) {
                    price = variant.offerPrice || variant.price || variant.sellingPrice || price;
                    stock = variant.stock;
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

        return this.getCart(userId);
    }

    async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
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

        return this.getCart(userId);
    }

    async removeItem(userId: string, itemId: string) {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart) throw new NotFoundException('Cart not found');

        // Verify ownership indirectly by checking cartId matches
        const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
        if (!item || item.cartId !== cart.id) {
            throw new NotFoundException('Cart item not found');
        }

        await this.prisma.cartItem.delete({ where: { id: itemId } });
        return this.getCart(userId);
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

    // Internal method for Checkout Module to force-get clean data
    async getCartSummaryForCheckout(userId: string) {
        const cartData = await this.getCart(userId);
        if (!cartData.id || cartData.items.length === 0) {
            return null;
        }

        return {
            cartId: cartData.id,
            items: cartData.items.map(i => ({
                productId: i.productId,
                variantId: i.variantId,
                quantity: i.quantity,
                price: i.price,
                subtotal: i.subtotal,
                vendorId: i.product.vendorId,
                productTitle: i.product.title,
                // Pass rules snapshot capability inputs
                minOrderQuantity: i.product.minOrderQuantity,
                quantityStepSize: i.product.quantityStepSize,
                totalAllowedQuantity: i.product.totalAllowedQuantity
            })),
            totalAmount: cartData.totalAmount
        };
    }
}
