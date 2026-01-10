import { PrismaService } from '../prisma/prisma.service';
export declare class AdminDashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardData(period: string): Promise<{
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
    }>;
    getKPIs(period: string): Promise<{
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
    getRevenueIntelligence(period: string): Promise<{
        onlineSuccessRate: number;
        codFailureRate: number;
        refundAmount: number;
        pendingPayouts: number;
    }>;
    getProductIntelligence(period: string): Promise<{
        topSelling: {
            id: string;
            name: string;
            orders: number;
            revenue: number;
        }[];
    }>;
    getActionItems(): Promise<any[]>;
    getCustomerSignals(period: string): Promise<{
        highReturn: number;
        abandonedHighValue: number;
        repeatBuyers: number;
    }>;
    getSystemHealth(): Promise<{
        failedPayments: number;
        apiErrors: number;
    }>;
    private getDateRange;
}
