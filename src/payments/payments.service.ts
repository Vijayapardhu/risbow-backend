import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { BowService } from '../bow/bow.service';
import { PaymentIntentPurpose } from '@prisma/client';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    private razorpay: Razorpay;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly bowService: BowService,
    ) {
        const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        if (!keyId || !keySecret) {
            this.logger.error('Razorpay keys are missing in configuration');
            throw new InternalServerErrorException('Payment gateway configuration is missing');
        }

        this.razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
    }

    async createOrder(userId: string, dto: CreatePaymentOrderDto) {
        const { currency = 'INR', orderId } = dto;

        // 1. Validate internal order existence
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { payment: true },
        });

        if (!order) {
            throw new BadRequestException('Invalid Order ID');
        }

        if (order.userId !== userId) {
            throw new BadRequestException('Order does not belong to user');
        }

        if (order.payment && order.payment.status === 'SUCCESS') {
            throw new BadRequestException('Order is already paid');
        }

        // 🔐 P0: Backend is source of truth for money.
        // Do NOT trust client-provided amount. Always charge the server-side order total.
        // NOTE: order.totalAmount is already stored in paise in this codebase.
        const expectedAmount = order.totalAmount;

        // 2. Create Razorpay Order
        let razorpayOrder;
        try {
            const options = {
                amount: expectedAmount, // Amount in paise (server-calculated)
                currency: currency,
                receipt: orderId,
                notes: {
                    userId: userId,
                    internalOrderId: orderId
                }
            };

            razorpayOrder = await this.razorpay.orders.create(options);
        } catch (error) {
            this.logger.error(`Razorpay order creation failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to create payment order with gateway');
        }

        // 3. Persist Payment Intent in DB (Upsert to handle retry case if payment failed previously)
        try {
            const payment = await this.prisma.payment.upsert({
                where: { orderId: orderId },
                update: {
                    amount: expectedAmount,
                    currency: currency,
                    provider: 'RAZORPAY',
                    providerOrderId: razorpayOrder.id,
                    status: 'PENDING',
                },
                create: {
                    orderId: orderId,
                    amount: expectedAmount,
                    currency: currency,
                    provider: 'RAZORPAY',
                    providerOrderId: razorpayOrder.id,
                    status: 'PENDING',
                }
            });

            // Update Order with Razorpay Order ID for reference
            await this.prisma.order.update({
                where: { id: orderId },
                data: { razorpayOrderId: razorpayOrder.id }
            });

            return {
                key: this.configService.get<string>('RAZORPAY_KEY_ID'), // Send key to client for checkout
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                internalOrderId: orderId
            };

        } catch (error) {
            this.logger.error(`Database persistence failed for payment: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to save payment record');
        }
    }

    /**
     * Create a Razorpay order for non-order payments (vendor monetization, memberships, etc.)
     * Idempotent per (purpose, referenceId).
     */
    async createPaymentIntent(params: {
        userId?: string;
        purpose: PaymentIntentPurpose;
        referenceId: string;
        amount: number; // paise
        currency?: string;
        metadata?: any;
    }) {
        const { userId, purpose, referenceId, amount } = params;
        const currency = params.currency || 'INR';

        if (!referenceId) throw new BadRequestException('referenceId is required');
        if (!Number.isInteger(amount) || amount < 100) throw new BadRequestException('amount must be integer paise >= 100');

        // 1) Idempotency: one intent per (purpose, referenceId)
        const existing = await (this.prisma as any).paymentIntent.findUnique({
            where: { purpose_referenceId: { purpose, referenceId } },
        }).catch(() => null);

        if (existing?.status === 'SUCCESS') {
            return {
                status: 'SUCCESS',
                intentId: existing.id,
                providerOrderId: existing.providerOrderId,
                message: 'Already paid',
            };
        }

        // 2) Create Razorpay Order
        let razorpayOrder;
        try {
            razorpayOrder = await this.razorpay.orders.create({
                amount,
                currency,
                receipt: `intent_${purpose}_${referenceId}`,
                notes: {
                    intentPurpose: purpose,
                    referenceId,
                    createdByUserId: userId,
                },
            });
        } catch (error) {
            this.logger.error(`Razorpay order creation failed (intent): ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to create payment order with gateway');
        }

        // 3) Upsert intent
        const intent = await (this.prisma as any).paymentIntent.upsert({
            where: { purpose_referenceId: { purpose, referenceId } },
            update: {
                amount,
                currency,
                provider: 'RAZORPAY',
                providerOrderId: razorpayOrder.id,
                status: 'PENDING',
                metadata: params.metadata || undefined,
                createdByUserId: userId || undefined,
            },
            create: {
                purpose,
                referenceId,
                amount,
                currency,
                provider: 'RAZORPAY',
                providerOrderId: razorpayOrder.id,
                status: 'PENDING',
                metadata: params.metadata || undefined,
                createdByUserId: userId || undefined,
            },
        });

        return {
            key: this.configService.get<string>('RAZORPAY_KEY_ID'),
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            intentId: intent.id,
            purpose,
            referenceId,
        };
    }

    async verifyPayment(userId: string, dto: VerifyPaymentDto) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        // 1. Verify Signature
        const generatedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            this.logger.warn(`Signature verification failed for order ${razorpay_order_id}`);
            throw new BadRequestException('Invalid payment signature');
        }

        // 2. Find internal payment record(s) (split-checkout can have multiple payments sharing providerOrderId)
        const payments = await this.prisma.payment.findMany({
            where: { providerOrderId: razorpay_order_id },
            include: { order: true }
        });

        if (!payments || payments.length === 0) {
            throw new BadRequestException('Payment record not found for this order');
        }

        // 3. Security Check: Ensure user owns all orders
        if (payments.some((p) => p.order.userId !== userId)) {
            throw new BadRequestException('Unauthorized access to this payment');
        }

        if (payments.every((p) => p.status === 'SUCCESS')) {
            return { status: 'SUCCESS', paymentId: payments[0].id, message: 'Payment already verified' };
        }

        // 4. Update Payment Status safely
        try {
            await this.prisma.payment.updateMany({
                where: { providerOrderId: razorpay_order_id, status: { not: 'SUCCESS' } as any },
                data: {
                    status: 'SUCCESS',
                    paymentId: razorpay_payment_id,
                }
            });

            // Consider updating Order status here if strictly required, but usually handled by webhook/separate flow.
            // Checklist says: "Do not mark orders as completed". So we just update Payment.

            this.logger.log(`Payment verified successfully for provider order ${razorpay_order_id}`);

            return {
                status: 'SUCCESS',
                paymentId: payments[0].id,
                transactionId: razorpay_payment_id
            };
        } catch (error) {
            this.logger.error(`Failed to update payment status: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to process payment verification');
        }
    }

    async handleWebhook(signature: string, rawBody: Buffer) {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            this.logger.error('RAZORPAY_WEBHOOK_SECRET is not defined');
            throw new InternalServerErrorException('Webhook configuration missing');
        }

        // 1. Verify Signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (signature !== expectedSignature) {
            this.logger.warn('Webhook signature verification failed');
            throw new BadRequestException('Invalid webhook signature');
        }

        // 2. Parse Body
        const body = JSON.parse(rawBody.toString());
        const event = body.event;
        const payload = body.payload?.payment?.entity;

        if (!payload) {
            return { status: 'ignored', message: 'No payment payload found' };
        }

        const razorpayOrderId = payload.order_id; // providerOrderId in our DB
        const razorpayPaymentId = payload.id;
        const status = payload.status; // 'captured', 'failed'

        this.logger.log(`Received webhook: ${event} for order ${razorpayOrderId}`);

        // 3. Find Internal Payment(s) (order payments) OR PaymentIntent (non-order payments)
        const payments = await this.prisma.payment.findMany({
            where: { providerOrderId: razorpayOrderId },
            include: { order: true }
        }).catch(() => []);

        const paymentIntent = (!payments || payments.length === 0)
            ? await (this.prisma as any).paymentIntent.findFirst({
                where: { providerOrderId: razorpayOrderId },
            }).catch(() => null)
            : null;

        if ((!payments || payments.length === 0) && !paymentIntent) {
            this.logger.warn(`Webhook received for unknown provider order: ${razorpayOrderId}`);
            return { status: 'ignored', message: 'Order/Intent not found' };
        }

        // 4. Idempotent Handling
        if (payments && payments.length > 0 && payments.every((p) => p.status === 'SUCCESS' || p.status === 'REFUNDED')) {
            this.logger.log(`Payments already final for provider order ${razorpayOrderId}. Ignoring webhook.`);
            return { status: 'ignored', message: 'Already processed' };
        }
        if (paymentIntent && (paymentIntent.status === 'SUCCESS' || paymentIntent.status === 'REFUNDED')) {
            this.logger.log(`PaymentIntent ${paymentIntent.id} already final: ${paymentIntent.status}. Ignoring webhook.`);
            return { status: 'ignored', message: 'Already processed' };
        }

        if (event === 'payment.captured') {
            if (payments && payments.length > 0) {
                await this.prisma.payment.updateMany({
                    where: { providerOrderId: razorpayOrderId, status: { not: 'SUCCESS' } as any },
                    data: { status: 'SUCCESS', paymentId: razorpayPaymentId }
                });
                this.logger.log(`Payments updated to SUCCESS via webhook for provider order ${razorpayOrderId}`);
            } else if (paymentIntent) {
                await (this.prisma as any).paymentIntent.update({
                    where: { id: paymentIntent.id },
                    data: {
                        status: 'SUCCESS',
                        paymentId: razorpayPaymentId,
                    }
                });
                this.logger.log(`PaymentIntent ${paymentIntent.id} updated to SUCCESS via webhook`);
            }
        } else if (event === 'payment.failed') {
            if (payments && payments.length > 0) {
                await this.prisma.payment.updateMany({
                    where: { providerOrderId: razorpayOrderId, status: { notIn: ['SUCCESS', 'REFUNDED'] } as any },
                    data: { status: 'FAILED', paymentId: razorpayPaymentId }
                });
                this.logger.log(`Payments updated to FAILED via webhook for provider order ${razorpayOrderId}`);

                // TRIGGER BOW RECOVERY NUDGE (best-effort, once)
                const first = payments[0];
                if (first?.order?.userId && first?.orderId) {
                    await this.bowService.handlePaymentFailure(first.order.userId, first.orderId);
                }
            } else if (paymentIntent) {
                await (this.prisma as any).paymentIntent.update({
                    where: { id: paymentIntent.id },
                    data: {
                        status: 'FAILED',
                        paymentId: razorpayPaymentId
                    }
                });
                this.logger.log(`PaymentIntent ${paymentIntent.id} updated to FAILED via webhook`);
            }
        }

        return { status: 'ok' };
    }

    async generateRazorpayOrder(amount: number, currency: string, receipt: string, notes: any) {
        try {
            const options = {
                amount: amount,
                currency: currency,
                receipt: receipt,
                notes: notes
            };
            return await this.razorpay.orders.create(options);
        } catch (error) {
            this.logger.error(`Razorpay order generation failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to generate payment order');
        }
    }
    async processRefund(paymentId: string, amount: number, adminId?: string, notes?: any) {
        try {
            // Fetch payment to get providerOrderId or paymentId (razorpay_payment_id)
            const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
            if (!payment) throw new NotFoundException('Payment record not found');
            if (!payment.paymentId) throw new BadRequestException('Payment was not completed (no provider payment ID)');

            const refund = await this.razorpay.payments.refund(payment.paymentId, {
                amount: amount, // Amount in paise
                notes: notes,
                speed: 'normal'
            });

            // 🔐 P0 FIX: ADD AUDIT LOGGING FOR REFUNDS
            if (adminId) {
                await this.prisma.auditLog.create({
                    data: {
                        adminId,
                        entity: 'PAYMENT',
                        entityId: paymentId,
                        action: 'REFUND_PROCESSED',
                        details: {
                            refundId: refund.id,
                            amount: amount,
                            notes: notes,
                            status: refund.status
                        }
                    }
                }).catch(err => this.logger.error(`Audit log failed: ${err.message}`));
            }

            return {
                refundId: refund.id,
                status: refund.status,
                amount: refund.amount
            };
        } catch (error) {
            this.logger.error(`Razorpay refund failed: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to process refund with gateway');
        }
    }
}
