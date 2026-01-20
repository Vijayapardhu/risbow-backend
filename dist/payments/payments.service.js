"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto = __importStar(require("crypto"));
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        const keyId = this.configService.get('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
        if (!keyId || !keySecret) {
            this.logger.error('Razorpay keys are missing in configuration');
            throw new common_1.InternalServerErrorException('Payment gateway configuration is missing');
        }
        this.razorpay = new razorpay_1.default({
            key_id: keyId,
            key_secret: keySecret,
        });
    }
    async createOrder(userId, dto) {
        const { amount, currency = 'INR', orderId } = dto;
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { payment: true },
        });
        if (!order) {
            throw new common_1.BadRequestException('Invalid Order ID');
        }
        if (order.userId !== userId) {
            throw new common_1.BadRequestException('Order does not belong to user');
        }
        if (order.payment && order.payment.status === 'SUCCESS') {
            throw new common_1.BadRequestException('Order is already paid');
        }
        let razorpayOrder;
        try {
            const options = {
                amount: amount,
                currency: currency,
                receipt: orderId,
                notes: {
                    userId: userId,
                    internalOrderId: orderId
                }
            };
            razorpayOrder = await this.razorpay.orders.create(options);
        }
        catch (error) {
            this.logger.error(`Razorpay order creation failed: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('Failed to create payment order with gateway');
        }
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
            await this.prisma.order.update({
                where: { id: orderId },
                data: { razorpayOrderId: razorpayOrder.id }
            });
            return {
                key: this.configService.get('RAZORPAY_KEY_ID'),
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                internalOrderId: orderId
            };
        }
        catch (error) {
            this.logger.error(`Database persistence failed for payment: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('Failed to save payment record');
        }
    }
    async verifyPayment(userId, dto) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;
        const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
        const generatedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');
        if (generatedSignature !== razorpay_signature) {
            this.logger.warn(`Signature verification failed for order ${razorpay_order_id}`);
            throw new common_1.BadRequestException('Invalid payment signature');
        }
        const payment = await this.prisma.payment.findFirst({
            where: { providerOrderId: razorpay_order_id },
            include: { order: true }
        });
        if (!payment) {
            throw new common_1.BadRequestException('Payment record not found for this order');
        }
        if (payment.order.userId !== userId) {
            throw new common_1.BadRequestException('Unauthorized access to this payment');
        }
        if (payment.status === 'SUCCESS') {
            return { status: 'SUCCESS', paymentId: payment.id, message: 'Payment already verified' };
        }
        try {
            const updatedPayment = await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCESS',
                    paymentId: razorpay_payment_id,
                }
            });
            this.logger.log(`Payment verified successfully for order ${payment.orderId}`);
            return {
                status: 'SUCCESS',
                paymentId: updatedPayment.id,
                transactionId: razorpay_payment_id
            };
        }
        catch (error) {
            this.logger.error(`Failed to update payment status: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('Failed to process payment verification');
        }
    }
    async handleWebhook(signature, rawBody) {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            this.logger.error('RAZORPAY_WEBHOOK_SECRET is not defined');
            throw new common_1.InternalServerErrorException('Webhook configuration missing');
        }
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');
        if (signature !== expectedSignature) {
            this.logger.warn('Webhook signature verification failed');
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
        const body = JSON.parse(rawBody.toString());
        const event = body.event;
        const payload = body.payload?.payment?.entity;
        if (!payload) {
            return { status: 'ignored', message: 'No payment payload found' };
        }
        const razorpayOrderId = payload.order_id;
        const razorpayPaymentId = payload.id;
        const status = payload.status;
        this.logger.log(`Received webhook: ${event} for order ${razorpayOrderId}`);
        const payment = await this.prisma.payment.findFirst({
            where: { providerOrderId: razorpayOrderId }
        });
        if (!payment) {
            this.logger.warn(`Webhook received for unknown order: ${razorpayOrderId}`);
            return { status: 'ignored', message: 'Order not found' };
        }
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
                }
            });
            this.logger.log(`Payment ${payment.id} updated to SUCCESS via webhook`);
        }
        else if (event === 'payment.failed') {
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
    async generateRazorpayOrder(amount, currency, receipt, notes) {
        try {
            const options = {
                amount: amount,
                currency: currency,
                receipt: receipt,
                notes: notes
            };
            return await this.razorpay.orders.create(options);
        }
        catch (error) {
            this.logger.error(`Razorpay order generation failed: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('Failed to generate payment order');
        }
    }
    async processRefund(paymentId, amount, notes) {
        try {
            const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
            if (!payment)
                throw new common_1.NotFoundException('Payment record not found');
            if (!payment.paymentId)
                throw new common_1.BadRequestException('Payment was not completed (no provider payment ID)');
            const refund = await this.razorpay.payments.refund(payment.paymentId, {
                amount: amount,
                notes: notes,
                speed: 'normal'
            });
            return {
                refundId: refund.id,
                status: refund.status,
                amount: refund.amount
            };
        }
        catch (error) {
            this.logger.error(`Razorpay refund failed: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('Failed to process refund with gateway');
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map