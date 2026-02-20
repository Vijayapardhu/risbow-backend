import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException, NotImplementedException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { BowService } from '../bow/bow.service';
import { BowFraudDetectionService } from '../bow/bow-fraud-detection.service';
import { PaymentIntentPurpose, VendorDocumentType, KycStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    private razorpay: Razorpay;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => BowService))
        private readonly bowService: BowService,
        private readonly fraudService: BowFraudDetectionService,
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

    async createOrder(userId: string, dto: CreatePaymentOrderDto, metadata?: { ip?: string; userAgent?: string }) {
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

        // 🔐 SECURITY: Perform Fraud Check
        const riskScore = await this.fraudService.analyzeTransaction(userId, {
            amount: expectedAmount,
            ipAddress: metadata?.ip,
            device: metadata?.userAgent,
            timestamp: new Date(),
        });

        if (riskScore.level === 'CRITICAL') {
            this.logger.warn(`Blocked payment initiation for user ${userId} due to CRITICAL fraud risk (Score: ${riskScore.score})`);
            throw new ForbiddenException('Payment initiation blocked due to security risk. Please contact support.');
        }

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
                    id: randomUUID(),
                    orderId: orderId,
                    amount: expectedAmount,
                    currency: currency,
                    provider: 'RAZORPAY',
                    providerOrderId: razorpayOrder.id,
                    status: 'PENDING',
                } as any
            });

            // Update Order with Razorpay Order ID for reference
            await this.prisma.order.update({
                where: { id: orderId },
                data: { razorpayOrderId: razorpayOrder.id }
            });

            const razorpayKeyId = this.configService.get<string>('RAZORPAY_KEY_ID');
            if (!razorpayKeyId) {
                throw new InternalServerErrorException('Razorpay key ID not configured');
            }

            return {
                key: razorpayKeyId, // Send key to client for checkout
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
                    ...(userId && { createdByUserId: userId }),
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
                providerOrderId: razorpayOrder!.id,
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
                providerOrderId: razorpayOrder!.id,
                status: 'PENDING',
                metadata: params.metadata || undefined,
                createdByUserId: userId || undefined,
            },
        });

        const razorpayKeyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        if (!razorpayKeyId) {
            throw new InternalServerErrorException('Razorpay key ID not configured');
        }

        return {
            key: razorpayKeyId!,
            orderId: razorpayOrder!.id,
            amount: razorpayOrder!.amount,
            currency: razorpayOrder!.currency,
            intentId: intent.id,
            purpose,
            referenceId,
        };
    }

    async verifyPayment(userId: string, dto: VerifyPaymentDto) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
        if (!keySecret) {
            throw new InternalServerErrorException('Razorpay key secret not configured');
        }

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
            include: { Order: true }
        });

        const paymentIntent = (!payments || payments.length === 0)
            ? await (this.prisma as any).paymentIntent.findFirst({
                where: { providerOrderId: razorpay_order_id },
            }).catch(() => null)
            : null;

        if ((!payments || payments.length === 0) && !paymentIntent) {
            throw new BadRequestException('Payment record not found for this order');
        }

        // 3. Security Check: Ensure user owns all orders or the payment intent
        if (payments && payments.length > 0 && payments.some((p) => p.Order.userId !== userId)) {
            throw new BadRequestException('Unauthorized access to this payment');
        }
        if (paymentIntent && paymentIntent.createdByUserId && paymentIntent.createdByUserId !== userId) {
            throw new BadRequestException('Unauthorized access to this payment intent');
        }

        if (paymentIntent) {
            if (paymentIntent.status === 'SUCCESS') {
                return { status: 'SUCCESS', paymentId: paymentIntent.id, message: 'Payment already verified' };
            }

            const updatedIntent = await (this.prisma as any).paymentIntent.update({
                where: { id: paymentIntent.id },
                data: { status: 'SUCCESS', paymentId: razorpay_payment_id },
            });

            await this.activateServiceOnPaymentSuccess(updatedIntent).catch(err => {
                this.logger.error(`Failed to activate service for PaymentIntent ${updatedIntent.id}: ${err.message}`, err.stack);
            });

            this.logger.log(`PaymentIntent verified successfully for provider order ${razorpay_order_id}`);

            return {
                status: 'SUCCESS',
                paymentId: paymentIntent.id,
                transactionId: razorpay_payment_id,
            };
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

        // Use timing-safe comparison to prevent timing attacks
        const isValidSig = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(signature, 'hex'),
        );
        if (!isValidSig) {
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
            include: { Order: true }
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
        if (payments && payments.length > 0 && payments.every((p: any) => p.status === 'SUCCESS' || p.status === 'REFUNDED')) {
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
                const updatedIntent = await (this.prisma as any).paymentIntent.update({
                    where: { id: paymentIntent.id },
                    data: {
                        status: 'SUCCESS',
                        paymentId: razorpayPaymentId,
                    }
                });
                this.logger.log(`PaymentIntent ${paymentIntent.id} updated to SUCCESS via webhook`);

                // Activate the associated service based on purpose
                await this.activateServiceOnPaymentSuccess(updatedIntent).catch(err => {
                    this.logger.error(`Failed to activate service for PaymentIntent ${updatedIntent.id}: ${err.message}`, err.stack);
                });
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
                if (first?.Order?.userId && first?.orderId) {
                    await this.bowService.handlePaymentFailure(first.Order.userId, first.orderId);
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

    /**
     * Activate the purchased service after PaymentIntent becomes SUCCESS.
     * Must be idempotent: safe to call multiple times for same intent.
     */
    private async activateServiceOnPaymentSuccess(paymentIntent: any) {
        const purpose: PaymentIntentPurpose = paymentIntent.purpose;
        const referenceId: string = paymentIntent.referenceId;

        // Defensive: only handle known purposes
        switch (purpose) {
            case PaymentIntentPurpose.BANNER_SLOT: {
                // For banner purchases, we mark the associated BannerCampaign as PAID (if present)
                await this.prisma.bannerCampaign.updateMany({
                    where: { bannerId: referenceId },
                    data: { paymentStatus: 'PAID' as any },
                });
                return;
            }
            case PaymentIntentPurpose.ROOM_PROMOTION: {
                // For room promotion purchases, we mark VendorPromotion as ACTIVE/PAID via metadata linkage
                await (this.prisma as any).vendorPromotion.updateMany({
                    where: { id: referenceId },
                    data: { status: 'ACTIVE' },
                }).catch(() => null);
                return;
            }
            case PaymentIntentPurpose.VENDOR_GST_COMPLIANCE: {
                const vendor = await this.prisma.vendor.findUnique({
                    where: { id: referenceId },
                    select: { id: true, kycStatus: true, kycDocuments: true },
                });

                if (!vendor) {
                    this.logger.warn(`Vendor not found for compliance payment, referenceId=${referenceId}`);
                    return;
                }

                const kycDocuments = (vendor.kycDocuments as any) || {};
                const nextDocuments = {
                    ...kycDocuments,
                    gstCompliance: {
                        status: 'PAID',
                        intentId: paymentIntent.id,
                        providerOrderId: paymentIntent.providerOrderId,
                        paymentId: paymentIntent.paymentId,
                        paidAt: new Date().toISOString(),
                    },
                };

                const nextStatus = vendor.kycStatus === 'PENDING_PAYMENT' ? 'PENDING' : vendor.kycStatus;
                await this.prisma.vendor.update({
                    where: { id: referenceId },
                    data: { kycDocuments: nextDocuments, kycStatus: nextStatus },
                });

                // If required documents are already approved, verify KYC immediately.
                const requiredTypes: VendorDocumentType[] = [
                    VendorDocumentType.AADHAAR_CARD, 
                    VendorDocumentType.PAN_CARD, 
                    VendorDocumentType.BANK_STATEMENT, 
                    VendorDocumentType.CANCELLED_CHEQUE, 
                    VendorDocumentType.DRIVING_LICENSE
                ];
                const approvedDocs = await this.prisma.vendorDocument.findMany({
                    where: {
                        vendorId: referenceId,
                        documentType: { in: requiredTypes },
                        status: 'APPROVED',
                    },
                    select: { documentType: true },
                });

                const approvedTypes = approvedDocs.map(doc => doc.documentType);
                const allApproved = requiredTypes.every(type => approvedTypes.includes(type));

                if (allApproved) {
                    await this.prisma.vendor.update({
                        where: { id: referenceId },
                        data: { kycStatus: KycStatus.VERIFIED },
                    });
                }

                return;
            }
            default:
                this.logger.warn(`No activation handler for PaymentIntent purpose=${purpose} referenceId=${referenceId}`);
                return;
        }
    }
    /**
     * STRUCTURALLY BLOCKED — Direct refunds violate RISBOW replacement-only policy.
     * 
     * RISBOW does not issue monetary refunds. All returns result in replacement orders.
     * This method is retained as a hard block to prevent accidental refund issuance.
     * Any attempt to call this will throw NotImplementedException.
     */
    async processRefund(_paymentId?: string, _amount?: number, _adminId?: string, _notes?: any): Promise<never> {
        this.logger.error('BLOCKED: Attempted to process a direct Razorpay refund — this violates replacement-only policy');
        throw new NotImplementedException(
            'Direct refunds are structurally blocked. RISBOW uses replacement-only returns. ' +
            'Use the Returns module to initiate a replacement order.'
        );
    }

    // === Vendor Onboarding Payment Methods ===

    async createVendorOnboardingOrder(vendorId: string) {
        // Check if vendor exists and needs payment
        const vendor = await (this.prisma.vendor.findUnique as any)({
            where: { id: vendorId },
            select: {
                id: true,
                name: true,
                email: true,
                kycStatus: true,
                isGstVerified: true,
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        if (vendor.kycStatus !== 'PENDING_PAYMENT') {
            throw new BadRequestException('Payment not required for this vendor');
        }

        // Create Razorpay order for ₹1000 onboarding fee
        const amount = 100000; // ₹1000 in paise
        const currency = 'INR';

        try {
            // Generate a short receipt ID (max 40 chars)
            const shortVendorId = vendorId.substring(0, 10);
            const timestamp = Date.now().toString().substring(5); // Last 8 digits
            const receipt = `vo_${shortVendorId}_${timestamp}`; // Format: vo_xxxxxxxxxx_xxxxxxxx
            
            const order = await this.razorpay.orders.create({
                amount,
                currency,
                receipt,
                notes: {
                    vendorId,
                    purpose: 'vendor_onboarding',
                    vendorName: vendor.name,
                },
            });

            this.logger.log(`Created vendor onboarding order ${order.id} for vendor ${vendorId}`);

            return {
                orderId: order.id,
                amount,
                currency,
                keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
            };
        } catch (error) {
            this.logger.error(`Failed to create vendor onboarding order: ${error?.message || JSON.stringify(error)}`);
            this.logger.error('Razorpay error details:', error);
            
            // Check if it's a Razorpay configuration issue
            if (!this.razorpay) {
                throw new InternalServerErrorException('Payment gateway not initialized. Check Razorpay credentials.');
            }
            
            throw new InternalServerErrorException(`Failed to create payment order: ${error?.message || 'Unknown error'}`);
        }
    }

    async verifyVendorOnboardingPayment(
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string,
        vendorId: string,
    ) {
        // Verify signature
        const text = `${razorpayOrderId}|${razorpayPaymentId}`;
        const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
        if (!secret) {
            throw new InternalServerErrorException('Razorpay key secret not configured');
        }
        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(text)
            .digest('hex');

        if (generatedSignature !== razorpaySignature) {
            this.logger.error('Vendor onboarding payment signature verification failed');
            throw new BadRequestException('Invalid payment signature');
        }

        // Fetch payment details from Razorpay
        try {
            const payment = await this.razorpay.payments.fetch(razorpayPaymentId);

            if (payment.status !== 'captured' && payment.status !== 'authorized') {
                throw new BadRequestException('Payment not successful');
            }

            // Update vendor kycStatus from PENDING_PAYMENT to PENDING
            await (this.prisma.vendor.update as any)({
                where: { id: vendorId },
                data: {
                    kycStatus: 'PENDING',
                    updatedAt: new Date(),
                },
            });

            this.logger.log(`Vendor onboarding payment verified for ${vendorId}. Status updated to PENDING`);

            // TODO: Send email notification

            return {
                success: true,
                message: 'Payment verified successfully. Your documents are now under review.',
                kycStatus: 'PENDING',
            };
        } catch (error) {
            this.logger.error(`Vendor onboarding payment verification failed: ${error.message}`);
            throw new BadRequestException('Payment verification failed');
        }
    }
}
