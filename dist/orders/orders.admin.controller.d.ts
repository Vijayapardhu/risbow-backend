import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';
export declare class OrdersAdminController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    findAll(page: string, limit: string, search: string, status: OrderStatus): Promise<{
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
    updateStatus(id: string, status: OrderStatus): Promise<{
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
