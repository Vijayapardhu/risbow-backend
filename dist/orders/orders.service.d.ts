import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { ConfigService } from '@nestjs/config';
import { RoomsService } from '../rooms/rooms.service';
import { CoinsService } from '../coins/coins.service';
export declare class OrdersService {
    private prisma;
    private configService;
    private roomsService;
    private coinsService;
    private razorpay;
    constructor(prisma: PrismaService, configService: ConfigService, roomsService: RoomsService, coinsService: CoinsService);
    createCheckout(userId: string, dto: CheckoutDto): Promise<{
        orderId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        key: any;
        coinsUsed: number;
        totalBeforeCoins: number;
    }>;
    confirmOrder(dto: ConfirmOrderDto): Promise<{
        status: string;
        orderId: string;
        message: string;
    } | {
        status: string;
        orderId: string;
        message?: undefined;
    }>;
    addGiftToOrder(orderId: string, userId: string, giftId: string): Promise<{
        message: string;
    }>;
}
