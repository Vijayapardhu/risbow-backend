import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { ConfigService } from '@nestjs/config';
import { RoomsService } from '../rooms/rooms.service';
export declare class OrdersService {
    private prisma;
    private configService;
    private roomsService;
    private razorpay;
    constructor(prisma: PrismaService, configService: ConfigService, roomsService: RoomsService);
    createCheckout(userId: string, dto: CheckoutDto): Promise<{
        orderId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        key: any;
    }>;
    confirmOrder(dto: ConfirmOrderDto): Promise<{
        status: string;
        orderId: string;
    }>;
    addGiftToOrder(orderId: string, userId: string, giftId: string): Promise<{
        message: string;
    }>;
}
