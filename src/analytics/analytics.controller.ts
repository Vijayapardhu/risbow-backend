import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('dashboard')
    async getDashboardStats() {
        return this.analyticsService.getDashboardStats();
    }

    @Get('sales')
    async getSalesChart(@Query('period') period: 'week' | 'month') {
        return this.analyticsService.getSalesChart(period);
    }

    @Get('search-misses')
    async getSearchMisses() {
        return this.analyticsService.getSearchMisses();
    }

    @Get('funnel')
    async getFunnelStats() {
        return this.analyticsService.getFunnelStats();
    }

    @Get('abandonment/metrics')
    async getAbandonmentMetrics(@Query('days') days?: string) {
        const daysNum = days ? parseInt(days, 10) : 7;
        return this.analyticsService.getAbandonmentMetrics(daysNum);
    }

    @Get('abandonment/telecaller-performance')
    async getTelecallerPerformance(@Query('days') days?: string) {
        const daysNum = days ? parseInt(days, 10) : 7;
        return this.analyticsService.getTelecallerPerformance(daysNum);
    }

    @Get('abandonment/trends')
    async getAbandonmentTrends(@Query('days') days?: string) {
        const daysNum = days ? parseInt(days, 10) : 30;
        return this.analyticsService.getAbandonmentTrends(daysNum);
    }
}
