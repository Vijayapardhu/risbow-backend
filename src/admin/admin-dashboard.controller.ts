import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Admin')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
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
}
