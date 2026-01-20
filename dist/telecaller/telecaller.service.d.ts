import { PrismaService } from '../prisma/prisma.service';
export declare class TelecallerService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(telecallerId: string): Promise<{
        myTasks: number;
        completed: number;
        pending: number;
        successRate: number;
    }>;
    getExpiringCoins(): Promise<{
        name: string;
        mobile: string;
        coins: number;
        expiryDate: Date;
        daysLeft: number;
        lastOrder: string;
    }[]>;
    getCheckoutRecoveryLeads(telecallerId: string): Promise<{
        id: string;
        customerName: any;
        mobile: any;
        cartValue: any;
        itemCount: number;
        abandonedAt: Date;
        priority: string;
        status: import(".prisma/client").$Enums.CheckoutRecoveryStatus;
    }[]>;
    getSupportTickets(): Promise<{
        id: string;
        subject: string;
        description: string;
        customerName: string;
        mobile: string;
        priority: string;
        createdAt: Date;
    }[]>;
}
