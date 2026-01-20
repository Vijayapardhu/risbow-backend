import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentsService } from '../payments/payments.service';
export declare class CheckoutService {
    private readonly prisma;
    private readonly paymentsService;
    constructor(prisma: PrismaService, paymentsService: PaymentsService);
    checkout(userId: string, dto: CheckoutDto): Promise<{
        message: string;
        orderId: string;
        status: string;
        paymentMode: string;
        totalAmount: number;
        razorpayOrderId?: undefined;
        amount?: undefined;
        currency?: undefined;
        key?: undefined;
    } | {
        message: string;
        orderId: string;
        status: string;
        paymentMode: string;
        razorpayOrderId: string;
        amount: string | number;
        currency: string;
        key: string;
        totalAmount?: undefined;
    }>;
}
