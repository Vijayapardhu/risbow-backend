import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    private razorpay: Razorpay;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
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
        const { amount, currency = 'INR', orderId } = dto;

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

        // 2. Create Razorpay Order
        let razorpayOrder;
        try {
            const options = {
                amount: amount, // Amount in paise
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
                    amount: amount,
                    currency: currency,
                    provider: 'RAZORPAY',
                    providerOrderId: razorpayOrder.id,
                    status: 'PENDING',
                },
                create: {
                    orderId: orderId,
                    amount: amount,
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

        // 2. Find internal payment record
        // Note: providerOrderId is not unique in schema, but practically should be.
        const payment = await this.prisma.payment.findFirst({
            where: { providerOrderId: razorpay_order_id },
            include: { order: true }
        });

        if (!payment) {
            throw new BadRequestException('Payment record not found for this order');
        }

        // 3. Security Check: Ensure user owns the order
        if (payment.order.userId !== userId) {
            throw new BadRequestException('Unauthorized access to this payment');
        }

        if (payment.status === 'SUCCESS') {
            return { status: 'SUCCESS', paymentId: payment.id, message: 'Payment already verified' };
        }

        // 4. Update Payment Status safely
        try {
            const updatedPayment = await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCESS',
                    paymentId: razorpay_payment_id,
                    // We could store signature or verification time in metadata if schema allowed, 
                    // but restricting to existing fields as per instructions.
                }
            });

            // Consider updating Order status here if strictly required, but usually handled by webhook/separate flow.
            // Checklist says: "Do not mark orders as completed". So we just update Payment.

            this.logger.log(`Payment verified successfully for order ${payment.orderId}`);

            return {
                status: 'SUCCESS',
                paymentId: updatedPayment.id,
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

        // 3. Find Internal Payment
        const payment = await this.prisma.payment.findFirst({
            where: { providerOrderId: razorpayOrderId }
        });

        if (!payment) {
            this.logger.warn(`Webhook received for unknown order: ${razorpayOrderId}`);
            // Return 200 to acknowledge receipt and stop retries, but log warning
            return { status: 'ignored', message: 'Order not found' };
        }

        // 4. Idempotent Handling
        if (payment.status === 'SUCCESS' || payment.status === 'REFUNDED') {
            this.logger.log(`Payment ${payment.id} already final: ${payment.status}. Ignoring webhook.`);
            return { status: 'ignored', message: 'Already processed' };
        }

        if (event === 'payment.captured') {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCESS',
                    paymentId: razorpayPaymentId,
                    // processedAt: new Date() // If schema had it
                }
            });
            this.logger.log(`Payment ${payment.id} updated to SUCCESS via webhook`);
        } else if (event === 'payment.failed') {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'FAILED',
                    paymentId: razorpayPaymentId
                }
            });
            this.logger.log(`Payment ${payment.id} updated to FAILED via webhook`);
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
    async processRefund(paymentId: string, amount: number, notes?: any) {
        try {
            // Fetch payment to get providerOrderId or paymentId (razorpay_payment_id)
            // The `paymentId` arg here refers to our internal DB ID or the Razorpay ID?
            // Let's assume it refers to our internal DB Payment ID for consistency, or we pass the razorpay_payment_id directly.
            // Looking at usage plan: RefundsService calls this.
            // Let's expect internal Payment entity or ID. 
            // Better: expect internal Payment ID, fetch it, then use provider's ID.

            const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
            if (!payment) throw new NotFoundException('Payment record not found');
            if (!payment.paymentId) throw new BadRequestException('Payment was not completed (no provider payment ID)');

            const refund = await this.razorpay.payments.refund(payment.paymentId, {
                amount: amount, // Amount in paise
                notes: notes,
                speed: 'normal'
            });

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
