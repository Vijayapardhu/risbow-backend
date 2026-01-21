import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentsService } from '../payments/payments.service';
import { GiftsService } from '../gifts/gifts.service';
import { CouponsService } from '../coupons/coupons.service';
export declare class CheckoutService {
    private readonly prisma;
    private readonly paymentsService;
    private readonly giftsService;
    private readonly couponsService;
    constructor(prisma: PrismaService, paymentsService: PaymentsService, giftsService: GiftsService, couponsService: CouponsService);
    checkout(userId: string, dto: CheckoutDto): Promise<{
        message: string;
        id: string;
        orderId: string;
        status: string;
        paymentMode: string;
        totalAmount: number;
        discountAmount: number;
        giftId: string;
        couponCode: string;
        razorpayOrderId?: undefined;
        amount?: undefined;
        currency?: undefined;
        key?: undefined;
    } | {
        message: string;
        id: string;
        orderId: string;
        status: string;
        paymentMode: string;
        razorpayOrderId: string;
        amount: string | number;
        currency: string;
        key: string;
        totalAmount: number;
        discountAmount: number;
        giftId: string;
        couponCode: string;
    }>;
}
