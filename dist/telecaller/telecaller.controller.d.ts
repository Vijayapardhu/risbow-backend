import { AdminService } from '../admin/admin.service';
export declare class TelecallerController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboard(): Promise<{
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
            expiryDate: string;
            daysLeft: number;
            lastOrder: string;
        }[];
        checkoutRecovery: {
            customerName: string;
            mobile: string;
            cartValue: number;
            itemCount: number;
            abandonedAt: string;
            priority: string;
        }[];
        supportTickets: {
            id: string;
            subject: string;
            description: string;
            customerName: string;
            mobile: string;
            priority: string;
            createdAt: string;
        }[];
    }>;
    getExpiringCoins(): Promise<{
        name: string;
        mobile: string;
        coins: number;
        expiryDate: string;
        daysLeft: number;
        lastOrder: string;
    }[]>;
    getCheckoutRecoveryLeads(): Promise<{
        customerName: string;
        mobile: string;
        cartValue: number;
        itemCount: number;
        abandonedAt: string;
        priority: string;
    }[]>;
    getSupportTickets(): Promise<{
        id: string;
        subject: string;
        description: string;
        customerName: string;
        mobile: string;
        priority: string;
        createdAt: string;
    }[]>;
}
