import { TelecallerService } from './telecaller.service';
export declare class TelecallerController {
    private readonly telecallerService;
    constructor(telecallerService: TelecallerService);
    getDashboard(req: any): Promise<{
        stats: {
            myTasks: number;
            completed: number;
            pending: number;
            successRate: number;
        };
        expiringCoins: {
            name: string;
            mobile: string;
            coins: number;
            expiryDate: Date;
            daysLeft: number;
            lastOrder: string;
        }[];
        checkoutRecovery: {
            id: string;
            customerName: any;
            mobile: any;
            cartValue: any;
            itemCount: number;
            abandonedAt: Date;
            priority: string;
            status: import(".prisma/client").$Enums.CheckoutRecoveryStatus;
        }[];
        supportTickets: {
            id: string;
            subject: string;
            description: string;
            customerName: string;
            mobile: string;
            priority: string;
            createdAt: Date;
        }[];
    }>;
    getExpiringCoins(): Promise<{
        name: string;
        mobile: string;
        coins: number;
        expiryDate: Date;
        daysLeft: number;
        lastOrder: string;
    }[]>;
    getCheckoutRecoveryLeads(req: any): Promise<{
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
