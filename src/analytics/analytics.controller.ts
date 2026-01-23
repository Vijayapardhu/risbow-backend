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
}
