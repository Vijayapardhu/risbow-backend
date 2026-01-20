import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(): Promise<{
        gmv: number;
        totalOrders: number;
        totalUsers: number;
        activeRooms: number;
        activeVendors: number;
    }>;
    getSalesChart(period?: 'week' | 'month'): Promise<any[]>;
}
