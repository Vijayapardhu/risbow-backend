"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CartService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CartService = CartService_1 = class CartService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CartService_1.name);
    }
    async getCartWithItems(userId) {
        return this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                vendor: true,
                            }
                        },
                    }
                }
            }
        });
    }
    async getCart(userId) {
        let cart = await this.getCartWithItems(userId);
        if (!cart) {
            return {
                id: null,
                items: [],
                totalAmount: 0,
                totalItems: 0
            };
        }
        const enrichedItems = await Promise.all(cart.items.map(async (item) => {
            let price = item.product.price;
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
                }
            }
            else {
                if (item.product.offerPrice) {
                    price = item.product.offerPrice;
                }
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
    async addItem(userId, dto) {
        const { productId, variantId, quantity } = dto;
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        let price = product.offerPrice || product.price;
        let availableStock = product.stock;
        if (variantId) {
            const variant = await this.prisma.productVariation.findUnique({ where: { id: variantId } });
            if (!variant)
                throw new common_1.NotFoundException('Variant not found');
            if (variant.productId !== productId)
                throw new common_1.BadRequestException('Variant does not belong to product');
            price = variant.sellingPrice;
            availableStock = variant.stock;
        }
        if (availableStock < quantity) {
            throw new common_1.BadRequestException(`Insufficient stock. Available: ${availableStock}`);
        }
        let cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart) {
            cart = await this.prisma.cart.create({ data: { userId } });
        }
        const existingItem = await this.prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId,
                variantId: variantId || null
            }
        });
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (availableStock < newQuantity) {
                throw new common_1.BadRequestException(`Insufficient stock for total quantity. Available: ${availableStock}`);
            }
            await this.prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: newQuantity }
            });
        }
        else {
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
    async updateItem(userId, itemId, dto) {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart)
            throw new common_1.NotFoundException('Cart not found');
        const item = await this.prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { product: true }
        });
        if (!item || item.cartId !== cart.id) {
            throw new common_1.NotFoundException('Cart item not found');
        }
        let availableStock = item.product.stock;
        if (item.variantId) {
            const variant = await this.prisma.productVariation.findUnique({ where: { id: item.variantId } });
            if (variant)
                availableStock = variant.stock;
        }
        if (availableStock < dto.quantity) {
            throw new common_1.BadRequestException(`Insufficient stock. Available: ${availableStock}`);
        }
        await this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity: dto.quantity }
        });
        return this.getCart(userId);
    }
    async removeItem(userId, itemId) {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart)
            throw new common_1.NotFoundException('Cart not found');
        const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
        if (!item || item.cartId !== cart.id) {
            throw new common_1.NotFoundException('Cart item not found');
        }
        await this.prisma.cartItem.delete({ where: { id: itemId } });
        return this.getCart(userId);
    }
    async clearCart(userId) {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (cart) {
            await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
        return { message: 'Cart cleared' };
    }
    async syncCart(userId, dto) {
        let cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart) {
            cart = await this.prisma.cart.create({ data: { userId } });
        }
        for (const itemDto of dto.items) {
            try {
                const product = await this.prisma.product.findUnique({ where: { id: itemDto.productId } });
                if (!product)
                    continue;
                let stock = product.stock;
                if (itemDto.variantId) {
                    const variant = await this.prisma.productVariation.findUnique({ where: { id: itemDto.variantId } });
                    if (!variant)
                        continue;
                    stock = variant.stock;
                }
                if (stock < 1)
                    continue;
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
                }
                else {
                    await this.prisma.cartItem.create({
                        data: {
                            cartId: cart.id,
                            productId: itemDto.productId,
                            variantId: itemDto.variantId,
                            quantity: quantity
                        }
                    });
                }
            }
            catch (e) {
                this.logger.error(`Failed to sync item ${itemDto.productId}: ${e.message}`);
            }
        }
        return this.getCart(userId);
    }
    async getCartSummaryForCheckout(userId) {
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
                productTitle: i.product.title
            })),
            totalAmount: cartData.totalAmount
        };
    }
};
exports.CartService = CartService;
exports.CartService = CartService = CartService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CartService);
//# sourceMappingURL=cart.service.js.map