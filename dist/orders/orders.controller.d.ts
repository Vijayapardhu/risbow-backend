import { OrdersService } from './orders.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    getMyOrders(req: any, page: string, limit: string): Promise<({
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
    getOrderDetails(req: any, orderId: string): Promise<{
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
    createOrder(req: any, orderData: any): Promise<{
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
}
