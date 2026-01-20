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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const checkout_dto_1 = require("./dto/checkout.dto");
const payments_service_1 = require("../payments/payments.service");
let CheckoutService = class CheckoutService {
    constructor(prisma, paymentsService) {
        this.prisma = prisma;
        this.paymentsService = paymentsService;
    }
    async checkout(userId, dto) {
        const { paymentMode, shippingAddressId, notes } = dto;
        return this.prisma.$transaction(async (tx) => {
            const cart = await tx.cart.findUnique({
                where: { userId },
                include: { items: true }
            });
            if (!cart || cart.items.length === 0) {
                throw new common_1.BadRequestException('Cart is empty');
            }
            const address = await tx.address.findUnique({
                where: { id: shippingAddressId }
            });
            if (!address) {
                throw new common_1.NotFoundException('Shipping address not found');
            }
            if (address.userId !== userId) {
                throw new common_1.BadRequestException('Invalid shipping address');
            }
            let totalAmount = 0;
            const orderItems = [];
            for (const item of cart.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product)
                    throw new common_1.NotFoundException(`Product ${item.productId} not found`);
                let price = product.offerPrice || product.price;
                let stock = product.stock;
                let variantSnapshot = null;
                if (item.variantId) {
                    const variant = await tx.productVariation.findUnique({ where: { id: item.variantId } });
                    if (!variant)
                        throw new common_1.NotFoundException(`Variant ${item.variantId} not found`);
                    price = variant.sellingPrice;
                    stock = variant.stock;
                    variantSnapshot = {
                        attributes: variant.attributes,
                        sku: variant.sku
                    };
                }
                if (stock < item.quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock for ${product.title}`);
                }
                const subtotal = price * item.quantity;
                totalAmount += subtotal;
                orderItems.push({
                    productId: product.id,
                    variantId: item.variantId,
                    vendorId: product.vendorId,
                    productTitle: product.title,
                    quantity: item.quantity,
                    price: price,
                    subtotal: subtotal,
                    variantSnapshot
                });
            }
            const orderStatus = paymentMode === checkout_dto_1.PaymentMode.COD ? 'CONFIRMED' : 'PENDING_PAYMENT';
            const order = await tx.order.create({
                data: {
                    userId,
                    addressId: shippingAddressId,
                    totalAmount,
                    status: orderStatus,
                    items: orderItems,
                }
            });
            if (paymentMode === checkout_dto_1.PaymentMode.COD) {
                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        amount: totalAmount,
                        currency: 'INR',
                        provider: 'COD',
                        status: 'PENDING',
                    }
                });
                await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
                return {
                    message: 'Order placed successfully',
                    orderId: order.id,
                    status: 'CONFIRMED',
                    paymentMode: 'COD',
                    totalAmount
                };
            }
            else {
                const razorpayOrder = await this.paymentsService.generateRazorpayOrder(totalAmount * 100, 'INR', order.id, { userId, internalOrderId: order.id });
                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        amount: totalAmount * 100,
                        currency: 'INR',
                        provider: 'RAZORPAY',
                        providerOrderId: razorpayOrder.id,
                        status: 'PENDING'
                    }
                });
                await tx.order.update({
                    where: { id: order.id },
                    data: { razorpayOrderId: razorpayOrder.id }
                });
                return {
                    message: 'Order created, proceed to payment',
                    orderId: order.id,
                    status: 'PENDING_PAYMENT',
                    paymentMode: 'ONLINE',
                    razorpayOrderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    key: process.env.RAZORPAY_KEY_ID
                };
            }
        });
    }
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payments_service_1.PaymentsService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map