import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
export declare class CheckoutController {
    private readonly checkoutService;
    constructor(checkoutService: CheckoutService);
    checkout(req: any, dto: CheckoutDto): Promise<{
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
