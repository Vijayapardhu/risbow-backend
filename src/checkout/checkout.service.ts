import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, PaymentMode } from './dto/checkout.dto';
import { PaymentsService } from '../payments/payments.service';
import { GiftsService } from '../gifts/gifts.service';
import { CouponsService } from '../coupons/coupons.service';
import { InventoryService } from '../inventory/inventory.service';
import { RedisService } from '../shared/redis.service';
import { PriceResolverService } from '../common/price-resolver.service';
import { CommissionService } from '../common/commission.service';

@Injectable()
export class CheckoutService {
    private readonly logger = new Logger(CheckoutService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly paymentsService: PaymentsService,
        private readonly giftsService: GiftsService,
        private readonly couponsService: CouponsService,
        private readonly inventoryService: InventoryService,  // 🔐 P0 FIX: Add InventoryService
        private readonly redisService: RedisService,
        private readonly priceResolver: PriceResolverService,
        private readonly commissionService: CommissionService,
    ) { }

    async checkout(userId: string, dto: CheckoutDto) {
        const { paymentMode, shippingAddressId, notes, giftId, couponCode } = dto;

        // 🔐 P0 FIX: Pre-fetch cart for stock reservation BEFORE transaction
        const cartForReservation = await this.prisma.cart.findUnique({
            where: { userId },
            include: { items: { include: { product: true } } }
        });

        if (!cartForReservation || cartForReservation.items.length === 0) {
            throw new BadRequestException('Cart is empty');
        }

        // 🔐 P0 FIX: Reserve stock BEFORE transaction to prevent overselling
        const reservedItems: { productId: string; variantId?: string; quantity: number }[] = [];

        try {
            for (const item of cartForReservation.items) {
                await this.inventoryService.reserveStock(
                    item.productId,
                    item.quantity,
                    item.variantId || undefined
                );
                reservedItems.push({
                    productId: item.productId,
                    variantId: item.variantId || undefined,
                    quantity: item.quantity
                });
            }
        } catch (reservationError) {
            // Release any already reserved stock if reservation fails
            for (const reserved of reservedItems) {
                await this.inventoryService.releaseStock(
                    reserved.productId,
                    reserved.quantity,
                    reserved.variantId
                ).catch(err => this.logger.error(`Failed to release reservation: ${err.message}`));
            }
            throw reservationError;
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
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

                // 🔐 P0 FIX: Stock deduction moved AFTER payment verification
                // This happens in OrdersService.confirmOrder() after payment is verified
                // Here we just validate stock is available
                let totalAmount = 0;
                const orderItems = [];
                const categoryIds = new Set<string>();

                for (const item of cart.items) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

                    categoryIds.add(product.categoryId);

                    // 🏢 Track 5.1: Wholesale & MOQ Logic
                    let price = product.offerPrice || product.price;

                    if (product.isWholesale) {
                        if (item.quantity < (product.moq || 1)) {
                            throw new BadRequestException(`Minimum order quantity for ${product.title} is ${product.moq}`);
                        }
                        price = product.wholesalePrice || price;
                    }

                    let stock = product.stock;
                    let variantSnapshot = null;

                    // Variant handling
                    if (item.variantId) {
                        const variant = await (tx as any).productVariant.findFirst({
                            where: { id: item.variantId, productId: product.id },
                        });
                        if (!variant) {
                            throw new BadRequestException(`Variant not found for product ${product.title}`);
                        }

                        price = (variant.price ?? null) ? Number(variant.price) : price;
                        stock = Number(variant.stock);
                        variantSnapshot = {
                            attributes: variant.attributes,
                            sku: variant.sku,
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

                // 🔐 P0 FIX: ATOMIC COUPON USAGE
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

                    // 🔐 ATOMIC CHECK: Increment usage count atomically
                    const couponUpdateResult = await tx.coupon.updateMany({
                        where: {
                            id: coupon.id,
                            OR: [
                                { usageLimit: null },
                                { usedCount: { lt: coupon.usageLimit } }
                            ]
                        },
                        data: { usedCount: { increment: 1 } }
                    });

                    if (couponUpdateResult.count === 0) {
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
                    // 🔐 P0 FIX: CLEAR CART FOR COD
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

                    // 🔐 P0 FIX: Create AbandonedCheckout record for payment recovery
                    // This enables automated detection if payment is not completed
                    const cartSnapshot = {
                        orderId: order.id,
                        items: orderItems,
                        itemCount: orderItems.length,
                    };

                    const financeSnapshot = {
                        subtotal: totalAmount,
                        taxAmount: Math.round(totalAmount * 0.18), // 18% GST
                        shippingAmount: 0, // Included in totalAmount
                        discountAmount,
                        totalAmount: finalAmount,
                        currency: 'INR',
                    };

                    const abandonedCheckout = await tx.abandonedCheckout.create({
                        data: {
                            userId,
                            cartSnapshot,
                            financeSnapshot,
                            status: 'NEW',
                            abandonReason: 'PAYMENT_PENDING',
                            paymentMethod: 'ONLINE',
                            metadata: {
                                type: 'CHECKOUT',
                                orderId: order.id,
                                razorpayOrderId: razorpayOrder.id,
                                createdAt: new Date().toISOString(),
                            },
                            abandonedAt: new Date(),
                        },
                    });

                    // 🔐 P0 FIX: Set Redis TTL for payment timeout detection (10 minutes default)
                    const paymentTimeoutMinutes = parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '10', 10);
                    const ttlSeconds = paymentTimeoutMinutes * 60;
                    await this.redisService.set(
                        `payment:timeout:${order.id}`,
                        abandonedCheckout.id,
                        ttlSeconds
                    ).catch(err => {
                        this.logger.warn(`Failed to set payment timeout TTL: ${err.message}`);
                    });

                    // 🔐 P0 FIX: CLEAR CART FOR ONLINE PAYMENT TOO
                    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

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
        } catch (error) {
            // 🔐 P0 FIX: Release reservations on transaction failure
            this.logger.error(`Checkout failed, releasing reservations: ${error.message}`);
            for (const reserved of reservedItems) {
                await this.inventoryService.releaseStock(
                    reserved.productId,
                    reserved.quantity,
                    reserved.variantId
                ).catch(err => this.logger.error(`Failed to release reservation: ${err.message}`));
            }
            throw error;
        }
    }
}
