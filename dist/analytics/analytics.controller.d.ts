import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboardStats(): Promise<{
        gmv: number;
        totalOrders: number;
        totalUsers: number;
        activeRooms: number;
        activeVendors: number;
    }>;
    getSalesChart(period: 'week' | 'month'): Promise<any[]>;
}
