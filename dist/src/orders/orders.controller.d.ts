import { OrdersService } from './orders.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    checkout(req: any, dto: CheckoutDto): Promise<{
        orderId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        key: any;
        coinsUsed: number;
        totalBeforeCoins: number;
    }>;
    confirm(dto: ConfirmOrderDto): Promise<{
        status: string;
        orderId: string;
        message: string;
    } | {
        status: string;
        orderId: string;
        message?: undefined;
    }>;
    addGift(orderId: string, giftId: string, req: any): Promise<{
        message: string;
    }>;
}
