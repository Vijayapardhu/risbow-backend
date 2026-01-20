import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, PaymentMode } from './dto/checkout.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class CheckoutService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paymentsService: PaymentsService
    ) { }

    async checkout(userId: string, dto: CheckoutDto) {
        const { paymentMode, shippingAddressId, notes } = dto;

        return this.prisma.$transaction(async (tx) => {
            // 1. Fetch Cart
            const cart = await tx.cart.findUnique({
                where: { userId },
                include: { items: true }
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

            for (const item of cart.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

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
                    vendorId: product.vendorId, // Important for grouping later if needed
                    productTitle: product.title,
                    quantity: item.quantity,
                    price: price,
                    subtotal: subtotal,
                    variantSnapshot
                });
            }

            // 4. Create Order
            const orderStatus = paymentMode === PaymentMode.COD ? 'CONFIRMED' : 'PENDING_PAYMENT';

            const order = await tx.order.create({
                data: {
                    userId,
                    addressId: shippingAddressId,
                    totalAmount,
                    status: orderStatus,
                    items: orderItems, // Storing strict snapshot
                    // notes: notes // Schema doesn't have notes field on Order yet
                }
            });

            // 5. Handle Payment Mode
            if (paymentMode === PaymentMode.COD) {
                // COD Flow
                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        amount: totalAmount,
                        currency: 'INR',
                        provider: 'COD',
                        status: 'PENDING', // COD payment is pending until delivery
                    }
                });

                // Clear Cart ONLY for COD success immediately
                await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

                return {
                    message: 'Order placed successfully',
                    orderId: order.id,
                    status: 'CONFIRMED',
                    paymentMode: 'COD',
                    totalAmount
                };

            } else {
                // ONLINE Flow (Razorpay)

                // A. Generate Razorpay Order via external API (using helper)
                const razorpayOrder = await this.paymentsService.generateRazorpayOrder(
                    totalAmount * 100, // Amount in paise
                    'INR',
                    order.id,
                    { userId, internalOrderId: order.id }
                );

                // B. Create local payment record
                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        amount: totalAmount * 100, // Store in paise for consistency with Razorpay? 
                        // Wait, previous Payment implementation seemed to store amount in some unit. 
                        // PaymentsService stores `amount: amount` passed to it. Razorpay takes paise.
                        // Ideally store in lowest unit or database standard. 
                        // Let's check `CreatePaymentOrderDto` usage in `PaymentsService`.
                        // It takes `amount`.
                        // Prims schema says `Int`. Usually means paise if integer.
                        // I will store exactly what Razorpay expects: paise.
                        currency: 'INR',
                        provider: 'RAZORPAY',
                        providerOrderId: razorpayOrder.id,
                        status: 'PENDING'
                    }
                });

                // Update Order with Razorpay Order ID
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
                    key: process.env.RAZORPAY_KEY_ID // Helper to client
                };
            }
        });
    }
}
