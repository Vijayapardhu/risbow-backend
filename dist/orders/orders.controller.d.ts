import { OrdersService } from './orders.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    getMyOrders(req: any, page: string, limit: string): Promise<({
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            amount: number;
            currency: string;
            orderId: string;
            provider: string;
            providerOrderId: string | null;
            paymentId: string | null;
        };
        address: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            name: string;
            title: string | null;
            phone: string;
            mobile: string | null;
            street: string | null;
            addressLine1: string;
            addressLine2: string | null;
            city: string;
            state: string;
            pincode: string;
            label: string;
            isDefault: boolean;
        };
    } & {
        id: string;
        roomId: string | null;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        status: import(".prisma/client").$Enums.OrderStatus;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        shippingCharges: number;
        agentId: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        addressId: string | null;
        abandonedCheckoutId: string | null;
    })[]>;
    getOrderDetails(req: any, orderId: string): Promise<{
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            amount: number;
            currency: string;
            orderId: string;
            provider: string;
            providerOrderId: string | null;
            paymentId: string | null;
        };
        address: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            name: string;
            title: string | null;
            phone: string;
            mobile: string | null;
            street: string | null;
            addressLine1: string;
            addressLine2: string | null;
            city: string;
            state: string;
            pincode: string;
            label: string;
            isDefault: boolean;
        };
    } & {
        id: string;
        roomId: string | null;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        coinsUsed: number;
        coinsUsedDebited: boolean;
        status: import(".prisma/client").$Enums.OrderStatus;
        razorpayOrderId: string | null;
        awbNumber: string | null;
        courierPartner: string | null;
        shippingCharges: number;
        agentId: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        addressId: string | null;
        abandonedCheckoutId: string | null;
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
