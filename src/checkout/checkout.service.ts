import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, PaymentMode } from './dto/checkout.dto';
import { PaymentsService } from '../payments/payments.service';
import { GiftsService } from '../gifts/gifts.service';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class CheckoutService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paymentsService: PaymentsService,
        private readonly giftsService: GiftsService,
        private readonly couponsService: CouponsService,
    ) { }

    async checkout(userId: string, dto: CheckoutDto) {
        const { paymentMode, shippingAddressId, notes, giftId, couponCode } = dto;

        return this.prisma.$transaction(async (tx) => {
            // 1. Fetch Cart
            const cart = await tx.cart.findUnique({
                where: { userId },
                include: { items: { include: { product: true } } }
            });

            if (!cart || cart.items.length === 0) {
                throw new BadRequestException('Cart is empty');
            }

            // 2. Validate Address
            const address = await tx.address.findUnique({
                where: { id: shippingAddressId }
            });

            if (!address) {
                throw new NotFoundException('Shipping address not found');
            }

            if (address.userId !== userId) {
                throw new BadRequestException('Invalid shipping address');
            }

            // 3. Prepare Order Items (Re-verify Stock & Price)
            let totalAmount = 0;
            const orderItems = [];
            const categoryIds = new Set<string>();

            for (const item of cart.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

                categoryIds.add(product.categoryId);

                let price = product.offerPrice || product.price;
                let stock = product.stock;
                let variantSnapshot = null;

                if (item.variantId) {
                    const variant = await tx.productVariation.findUnique({ where: { id: item.variantId } });
                    if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found`);

                    price = variant.sellingPrice;
                    stock = variant.stock;
                    variantSnapshot = {
                        attributes: variant.attributes,
                        sku: variant.sku
                    };
                }

                if (stock < item.quantity) {
                    throw new BadRequestException(`Insufficient stock for ${product.title}`);
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

                // Decrement stock
                if (item.variantId) {
                    await tx.productVariation.update({
                        where: { id: item.variantId },
                        data: { stock: { decrement: item.quantity } }
                    });
                } else {
                    await tx.product.update({
                        where: { id: product.id },
                        data: { stock: { decrement: item.quantity } }
                    });
                }
            }

            // 4. Validate and Apply Gift (if provided)
            let selectedGiftId: string | null = null;
            if (giftId) {
                const gift = await tx.giftSKU.findUnique({ where: { id: giftId } });
                if (!gift) {
                    throw new NotFoundException('Gift not found');
                }

                if (gift.stock <= 0) {
                    throw new BadRequestException('Gift out of stock');
                }

                // Validate gift eligibility
                const eligibleCategories = gift.eligibleCategories as string[];
                const cartCategories = Array.from(categoryIds);
                const hasEligibleCategory = eligibleCategories.some(cat => cartCategories.includes(cat));

                if (!hasEligibleCategory && eligibleCategories.length > 0) {
                    throw new BadRequestException('Gift not eligible for cart items');
                }

                if (totalAmount < gift.cost) {
                    throw new BadRequestException(`Minimum cart value of ₹${gift.cost} required for this gift`);
                }

                // Decrement gift stock
                await tx.giftSKU.update({
                    where: { id: giftId },
                    data: { stock: { decrement: 1 } }
                });

                selectedGiftId = giftId;
            }

            // 5. Validate and Apply Coupon (if provided)
            let discountAmount = 0;
            let appliedCouponCode: string | null = null;

            if (couponCode) {
                const coupon = await tx.coupon.findUnique({
                    where: { code: couponCode }
                });

                if (!coupon) {
                    throw new NotFoundException('Coupon not found');
                }

                if (!coupon.isActive) {
                    throw new BadRequestException('Coupon is inactive');
                }

                if (coupon.validUntil && new Date() > coupon.validUntil) {
                    throw new BadRequestException('Coupon has expired');
                }

                if (coupon.minOrderAmount && totalAmount < coupon.minOrderAmount) {
                    throw new BadRequestException(`Minimum order amount of ₹${coupon.minOrderAmount} required`);
                }

                if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
                    throw new BadRequestException('Coupon usage limit exceeded');
                }

                // Calculate discount
                if (coupon.discountType === 'PERCENTAGE') {
                    discountAmount = Math.floor((totalAmount * coupon.discountValue) / 100);
                    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                        discountAmount = coupon.maxDiscount;
                    }
                } else if (coupon.discountType === 'FLAT') {
                    discountAmount = coupon.discountValue;
                }

                // Ensure discount doesn't exceed total
                if (discountAmount > totalAmount) {
                    discountAmount = totalAmount;
                }

                // Increment coupon usage
                await tx.coupon.update({
                    where: { id: coupon.id },
                    data: { usedCount: { increment: 1 } }
                });

                appliedCouponCode = couponCode;
            }

            // Calculate final amount
            const finalAmount = totalAmount - discountAmount;

            // 6. Create Order
            const orderStatus = paymentMode === PaymentMode.COD ? 'CONFIRMED' : 'PENDING_PAYMENT';

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

            // 7. Handle Payment Mode
            if (paymentMode === PaymentMode.COD) {
                // COD Flow
                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        amount: finalAmount,
                        currency: 'INR',
                        provider: 'COD',
                        status: 'PENDING',
                    }
                });

                // Clear Cart
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

            } else {
                // ONLINE Flow (Razorpay)
                const razorpayOrder = await this.paymentsService.generateRazorpayOrder(
                    finalAmount * 100, // Amount in paise
                    'INR',
                    order.id,
                    { userId, internalOrderId: order.id }
                );

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
}
