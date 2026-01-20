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
            let price = item.product.price; // Fallback
            let stock = item.product.stock;
            let title = item.product.title;
            let image = item.product.images?.[0] || '';

            if (item.variantId) {
                const variant = await this.prisma.productVariation.findUnique({
                    where: { id: item.variantId }
                });
                if (variant) {
                    price = variant.sellingPrice;
                    stock = variant.stock;
                    // title += ` - ${variant.attributes}`; // Simplification
                }
            } else {
                if (item.product.offerPrice) {
                    price = item.product.offerPrice;
                }
            }

            return {
                ...item,
                price,
                subtotal: price * item.quantity,
                stock, // For frontend to show out of stock
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

    async addItem(userId: string, dto: AddCartItemDto) {
        const { productId, variantId, quantity } = dto;

        // 1. Verify Product & Variant + Stock
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new NotFoundException('Product not found');

        let price = product.offerPrice || product.price;
        let availableStock = product.stock;

        if (variantId) {
            const variant = await this.prisma.productVariation.findUnique({ where: { id: variantId } });
            if (!variant) throw new NotFoundException('Variant not found');
            if (variant.productId !== productId) throw new BadRequestException('Variant does not belong to product');
            price = variant.sellingPrice;
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
        // Since prisma composite unique constraint usually handles this, 
        // but CartItem doesn't seem to have a unique constraint on [cartId, productId, variantId] in the provided schema dump.
        // using findFirst.
        const existingItem = await this.prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId,
                variantId: variantId || null // Handle optional
            }
        });

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
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
            include: { product: true } // Need to identify product to check variant
        });

        if (!item || item.cartId !== cart.id) {
            throw new NotFoundException('Cart item not found');
        }

        // Stock Validation
        let availableStock = item.product.stock;
        if (item.variantId) {
            const variant = await this.prisma.productVariation.findUnique({ where: { id: item.variantId } });
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

        // 2. Process items (Strategies: Merge? Overwrite? Usually Merge for "Sync")
        // We will loop through incoming items and upsert them safely.

        for (const itemDto of dto.items) {
            try {
                // Check stock silently. If out of stock, skip adding? Or add max?
                // Prompt says: "Ignore invalid items".

                const product = await this.prisma.product.findUnique({ where: { id: itemDto.productId } });
                if (!product) continue;

                let stock = product.stock;
                if (itemDto.variantId) {
                    const variant = await this.prisma.productVariation.findUnique({ where: { id: itemDto.variantId } });
                    if (!variant) continue;
                    stock = variant.stock;
                }

                if (stock < 1) continue; // Skip out of stock entirely

                const quantity = Math.min(itemDto.quantity, stock); // Cap at available stock? Or fail? Prompt rule: "Validate stock". 
                // Behavior: "Valid items merged".

                const existing = await this.prisma.cartItem.findFirst({
                    where: {
                        cartId: cart.id,
                        productId: itemDto.productId,
                        variantId: itemDto.variantId || null
                    }
                });

                if (existing) {
                    // Check existing + new vs Stock? Or just ensure total is valid?
                    // Let's ensure strict sync replacement for simplicity, or max(existing, new)?
                    // Client usually sends "Current Local State". So we should overwrite quantity, but ensure it doesn't exceed stock.
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

        // Group by Vendor for Split Orders (if logic requires)
        // Returning flat list for now but ensuring all prices are authoritative
        return {
            cartId: cartData.id,
            items: cartData.items.map(i => ({
                productId: i.productId,
                variantId: i.variantId,
                quantity: i.quantity,
                price: i.price,
                subtotal: i.subtotal,
                vendorId: i.product.vendorId,
                productTitle: i.product.title
            })),
            totalAmount: cartData.totalAmount
        };
    }
}
