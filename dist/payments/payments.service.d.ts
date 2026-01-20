import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
export declare class PaymentsService {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    private razorpay;
    constructor(configService: ConfigService, prisma: PrismaService);
    createOrder(userId: string, dto: CreatePaymentOrderDto): Promise<{
        key: string;
        orderId: any;
        amount: any;
        currency: any;
        internalOrderId: string;
    }>;
    verifyPayment(userId: string, dto: VerifyPaymentDto): Promise<{
        status: string;
        paymentId: string;
        message: string;
        transactionId?: undefined;
    } | {
        status: string;
        paymentId: string;
        transactionId: string;
        message?: undefined;
    }>;
    handleWebhook(signature: string, rawBody: Buffer): Promise<{
        status: string;
        message: string;
    } | {
        status: string;
        message?: undefined;
    }>;
    generateRazorpayOrder(amount: number, currency: string, receipt: string, notes: any): Promise<import("razorpay/dist/types/orders").Orders.RazorpayOrder>;
    processRefund(paymentId: string, amount: number, notes?: any): Promise<{
        refundId: string;
        status: "pending" | "processed" | "failed";
        amount: number;
    }>;
}
