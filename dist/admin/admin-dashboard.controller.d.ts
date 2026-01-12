import { AdminDashboardService } from './admin-dashboard.service';
export declare class AdminDashboardController {
    private readonly dashboardService;
    constructor(dashboardService: AdminDashboardService);
    getDashboardData(period?: string): Promise<{
        kpis: {
            gmv: number;
            gmvTrend: string;
            commission: number;
            commissionTrend: string;
            netRevenue: number;
            revenueTrend: string;
            ordersToday: number;
            codOrders: number;
            onlineOrders: number;
            activeVendors: number;
            conversionRate: number;
        };
        orderFunnel: {
            pending: number;
            pendingAlert: boolean;
            confirmed: number;
            packed: number;
            shipped: number;
            delivered: number;
            cancelled: number;
            cancelledSpike: boolean;
        };
        revenue: {
            onlineSuccessRate: number;
            codFailureRate: number;
            refundAmount: number;
            pendingPayouts: number;
        };
        products: {
            topSelling: {
                id: string;
                name: string;
                orders: number;
                revenue: number;
            }[];
        };
        actions: any[];
        customers: {
            highReturn: number;
            abandonedHighValue: number;
            repeatBuyers: number;
        };
        system: {
            failedPayments: number;
            apiErrors: number;
        };
        recentOrders: {
            id: string;
            customer: string;
            avatar: any;
            email: string;
            amount: number;
            status: import(".prisma/client").$Enums.OrderStatus;
            date: Date;
            items: number;
        }[];
        trendingShops: {
            id: string;
            name: string;
            logo: any;
            category: string;
            sales: number;
            revenue: number;
            trend: string;
        }[];
    }>;
    getKPIs(period?: string): Promise<{
        gmv: number;
        gmvTrend: string;
        commission: number;
        commissionTrend: string;
        netRevenue: number;
        revenueTrend: string;
        ordersToday: number;
        codOrders: number;
        onlineOrders: number;
        activeVendors: number;
        conversionRate: number;
    }>;
    getOrderFunnel(): Promise<{
        pending: number;
        pendingAlert: boolean;
        confirmed: number;
        packed: number;
        shipped: number;
        delivered: number;
        cancelled: number;
        cancelledSpike: boolean;
    }>;
    getRevenueIntelligence(period?: string): Promise<{
        onlineSuccessRate: number;
        codFailureRate: number;
        refundAmount: number;
        pendingPayouts: number;
    }>;
    getActionItems(): Promise<any[]>;
    getCustomerSignals(period?: string): Promise<{
        highReturn: number;
        abandonedHighValue: number;
        repeatBuyers: number;
    }>;
    getSystemHealth(): Promise<{
        failedPayments: number;
        apiErrors: number;
    }>;
}
