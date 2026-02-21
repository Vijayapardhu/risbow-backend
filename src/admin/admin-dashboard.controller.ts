import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';

@ApiTags('Admin')
@Controller('admin/dashboard')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.OPERATIONS_ADMIN)
export class AdminDashboardController {
    constructor(private readonly dashboardService: AdminDashboardService) { }

    @Get()
    async getDashboardData(@Query('period') period: string = 'Last 7 Days') {
        return this.dashboardService.getDashboardData(period);
    }

    @Get('kpis')
    async getKPIs(@Query('period') period: string = 'Last 7 Days') {
        return this.dashboardService.getKPIs(period);
    }

    @Get('order-funnel')
    async getOrderFunnel() {
        return this.dashboardService.getOrderFunnel();
    }

    @Get('revenue-intelligence')
    async getRevenueIntelligence(@Query('period') period: string = 'Last 7 Days') {
        return this.dashboardService.getRevenueIntelligence(period);
    }

    @Get('action-items')
    async getActionItems() {
        return this.dashboardService.getActionItems();
    }

    @Get('customer-signals')
    async getCustomerSignals(@Query('period') period: string = 'Last 7 Days') {
        return this.dashboardService.getCustomerSignals(period);
    }

    @Get('system-health')
    async getSystemHealth() {
        return this.dashboardService.getSystemHealth();
    }

    @Get('stats')
    async getStats() {
        return this.dashboardService.getStats();
    }

    @Get('top-products')
    async getTopProducts(
        @Query('limit') limit: string = '10',
        @Query('sortBy') sortBy: 'sales' | 'revenue' = 'revenue',
        @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
        @Query('categoryId') categoryId?: string,
        @Query('period') period: 'this_month' | 'last_month' | 'custom' = 'this_month',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.dashboardService.getTopProducts({
            limit: parseInt(limit, 10),
            sortBy,
            sortOrder,
            categoryId,
            period,
            startDate,
            endDate,
        });
    }

    @Get('revenue')
    async getRevenue(@Query('period') period: string = 'monthly') {
        return this.dashboardService.getRevenueByPeriod(period);
    }

    @Get('trending-shops')
    async getTrendingShops() {
        return this.dashboardService.getTrendingShops();
    }

    @Get('favorite-products')
    async getFavoriteProducts(@Query('limit') limit: string = '5') {
        return this.dashboardService.getTopProducts(parseInt(limit, 10));
    }

    @Get('recent-orders')
    async getRecentOrders() {
        return this.dashboardService.getRecentOrders();
    }

    @Get('user-distribution')
    async getUserDistribution() {
        // Mock data to prevent 404
        return [
            { name: 'Direct', value: 400 },
            { name: 'Social', value: 300 },
            { name: 'Search', value: 300 },
        ];
    }

    @Get('wallet-stats')
    async getWalletStats() {
        // Mock data to prevent 404
        return {
            totalBalance: 2500000,
            pendingSettlements: 450000,
            recentTransactions: []
        };
    }
}

