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
const gifts_service_1 = require("../gifts/gifts.service");
const coupons_service_1 = require("../coupons/coupons.service");
let CheckoutService = class CheckoutService {
    constructor(prisma, paymentsService, giftsService, couponsService) {
        this.prisma = prisma;
        this.paymentsService = paymentsService;
        this.giftsService = giftsService;
        this.couponsService = couponsService;
    }
    async checkout(userId, dto) {
        const { paymentMode, shippingAddressId, notes, giftId, couponCode } = dto;
        return this.prisma.$transaction(async (tx) => {
            const cart = await tx.cart.findUnique({
                where: { userId },
                include: { items: { include: { product: true } } }
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
            const categoryIds = new Set();
            for (const item of cart.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product)
                    throw new common_1.NotFoundException(`Product ${item.productId} not found`);
                categoryIds.add(product.categoryId);
                let price = product.offerPrice || product.price;
                let stock = product.stock;
                let variantSnapshot = null;
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
                await tx.product.update({
                    where: { id: product.id },
                    data: { stock: { decrement: item.quantity } }
                });
            }
            let selectedGiftId = null;
            if (giftId) {
                const gift = await tx.giftSKU.findUnique({ where: { id: giftId } });
                if (!gift) {
                    throw new common_1.NotFoundException('Gift not found');
                }
                if (gift.stock <= 0) {
                    throw new common_1.BadRequestException('Gift out of stock');
                }
                const eligibleCategories = gift.eligibleCategories;
                const cartCategories = Array.from(categoryIds);
                const hasEligibleCategory = eligibleCategories.some(cat => cartCategories.includes(cat));
                if (!hasEligibleCategory && eligibleCategories.length > 0) {
                    throw new common_1.BadRequestException('Gift not eligible for cart items');
                }
                if (totalAmount < gift.cost) {
                    throw new common_1.BadRequestException(`Minimum cart value of ₹${gift.cost} required for this gift`);
                }
                await tx.giftSKU.update({
                    where: { id: giftId },
                    data: { stock: { decrement: 1 } }
                });
                selectedGiftId = giftId;
            }
            let discountAmount = 0;
            let appliedCouponCode = null;
            if (couponCode) {
                const coupon = await tx.coupon.findUnique({
                    where: { code: couponCode }
                });
                if (!coupon) {
                    throw new common_1.NotFoundException('Coupon not found');
                }
                if (!coupon.isActive) {
                    throw new common_1.BadRequestException('Coupon is inactive');
                }
                if (coupon.validUntil && new Date() > coupon.validUntil) {
                    throw new common_1.BadRequestException('Coupon has expired');
                }
                if (coupon.minOrderAmount && totalAmount < coupon.minOrderAmount) {
                    throw new common_1.BadRequestException(`Minimum order amount of ₹${coupon.minOrderAmount} required`);
                }
                if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
                    throw new common_1.BadRequestException('Coupon usage limit exceeded');
                }
                if (coupon.discountType === 'PERCENTAGE') {
                    discountAmount = Math.floor((totalAmount * coupon.discountValue) / 100);
                    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                        discountAmount = coupon.maxDiscount;
                    }
                }
                else if (coupon.discountType === 'FLAT') {
                    discountAmount = coupon.discountValue;
                }
                if (discountAmount > totalAmount) {
                    discountAmount = totalAmount;
                }
                await tx.coupon.update({
                    where: { id: coupon.id },
                    data: { usedCount: { increment: 1 } }
                });
                appliedCouponCode = couponCode;
            }
            const finalAmount = totalAmount - discountAmount;
            const orderStatus = paymentMode === checkout_dto_1.PaymentMode.COD ? 'CONFIRMED' : 'PENDING_PAYMENT';
            const order = await tx.order.create({
                data: {
                    userId,
                    addressId: shippingAddressId,
                    totalAmount: finalAmount,
                    status: orderStatus,
                    items: orderItems,
                    giftId: selectedGiftId,
                    couponCode: appliedCouponCode,
                    discountAmount,
                }
            });
            if (paymentMode === checkout_dto_1.PaymentMode.COD) {
                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        amount: finalAmount,
                        currency: 'INR',
                        provider: 'COD',
                        status: 'PENDING',
                    }
                });
                await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
                return {
                    message: 'Order placed successfully',
                    id: order.id,
                    orderId: order.id,
                    status: 'CONFIRMED',
                    paymentMode: 'COD',
                    totalAmount: finalAmount,
                    discountAmount,
                    giftId: selectedGiftId,
                    couponCode: appliedCouponCode,
                };
            }
            else {
                const razorpayOrder = await this.paymentsService.generateRazorpayOrder(finalAmount * 100, 'INR', order.id, { userId, internalOrderId: order.id });
                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        amount: finalAmount * 100,
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
                    id: order.id,
                    orderId: order.id,
                    status: 'PENDING_PAYMENT',
                    paymentMode: 'ONLINE',
                    razorpayOrderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    key: process.env.RAZORPAY_KEY_ID,
                    totalAmount: finalAmount,
                    discountAmount,
                    giftId: selectedGiftId,
                    couponCode: appliedCouponCode,
                };
            }
        });
    }
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payments_service_1.PaymentsService,
        gifts_service_1.GiftsService,
        coupons_service_1.CouponsService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map