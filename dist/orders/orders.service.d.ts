import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { RoomsService } from '../rooms/rooms.service';
import { CoinsService } from '../coins/coins.service';
export declare class OrdersService {
    private prisma;
    private configService;
    private roomsService;
    private coinsService;
    private razorpay;
    constructor(prisma: PrismaService, configService: ConfigService, roomsService: RoomsService, coinsService: CoinsService);
    createCheckout(userId: string, dto: CheckoutDto & {
        abandonedCheckoutId?: string;
    }): Promise<{
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
    getUserOrders(userId: string, page?: number, limit?: number): Promise<({
        address: {
            id: string;
            mobile: string | null;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            title: string | null;
            phone: string;
            street: string | null;
            addressLine1: string;
            addressLine2: string | null;
            city: string;
            state: string;
            pincode: string;
            label: string;
            isDefault: boolean;
        };
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            amount: number;
            orderId: string;
            currency: string;
            provider: string;
            providerOrderId: string | null;
            paymentId: string | null;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        items: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        roomId: string | null;
        addressId: string | null;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        abandonedCheckoutId: string | null;
        agentId: string | null;
    })[]>;
    getOrderDetails(userId: string, orderId: string): Promise<{
        address: {
            id: string;
            mobile: string | null;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            title: string | null;
            phone: string;
            street: string | null;
            addressLine1: string;
            addressLine2: string | null;
            city: string;
            state: string;
            pincode: string;
            label: string;
            isDefault: boolean;
        };
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            amount: number;
            orderId: string;
            currency: string;
            provider: string;
            providerOrderId: string | null;
            paymentId: string | null;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        items: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        roomId: string | null;
        addressId: string | null;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        abandonedCheckoutId: string | null;
        agentId: string | null;
    }>;
    createOrder(userId: string, orderData: any): Promise<{
        success: boolean;
        orderId: string;
        order: {
            id: string;
            userId: string;
            addressId: any;
            totalAmount: number;
            status: string;
            paymentMethod: any;
            createdAt: string;
        };
        message: string;
    }>;
    findAllOrders(params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: OrderStatus;
    }): Promise<{
        data: ({
            user: {
                id: string;
                mobile: string;
                email: string;
                name: string;
            };
            address: {
                id: string;
                mobile: string | null;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                title: string | null;
                phone: string;
                street: string | null;
                addressLine1: string;
                addressLine2: string | null;
                city: string;
                state: string;
                pincode: string;
                label: string;
                isDefault: boolean;
            };
            payment: {
                id: string;
                status: import(".prisma/client").$Enums.PaymentStatus;
                createdAt: Date;
                updatedAt: Date;
                amount: number;
                orderId: string;
                currency: string;
                provider: string;
                providerOrderId: string | null;
                paymentId: string | null;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            items: import("@prisma/client/runtime/library").JsonValue;
            userId: string;
            roomId: string | null;
            addressId: string | null;
            totalAmount: number;
            coinsUsed: number;
            coinsUsedDebited: boolean;
            razorpayOrderId: string | null;
            awbNumber: string | null;
            courierPartner: string | null;
            abandonedCheckoutId: string | null;
            agentId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    updateOrderStatus(orderId: string, status: OrderStatus): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        items: import("@prisma/client/runtime/library").JsonValue;
        userId: string;
        roomId: string | null;
        addressId: string | null;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        abandonedCheckoutId: string | null;
        agentId: string | null;
    }>;
}
