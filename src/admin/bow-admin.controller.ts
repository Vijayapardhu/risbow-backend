import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { BowAdminService } from './bow-admin.service';

@ApiTags('Admin - Bow AI')
@Controller('admin/bow')
@UseGuards(AdminGuard)
export class BowAdminController {
    constructor(private readonly bowAdminService: BowAdminService) {}

    @Get('analytics/overview')
    @ApiOperation({ summary: 'Get Bow performance overview' })
    @ApiResponse({ status: 200, description: 'Bow analytics overview' })
    async getAnalyticsOverview(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        return this.bowAdminService.getAnalyticsOverview(start, end);
    }

    @Get('analytics/actions')
    @ApiOperation({ summary: 'Get Bow action analytics' })
    @ApiResponse({ status: 200, description: 'Bow action analytics' })
    async getActionAnalytics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        return this.bowAdminService.getActionAnalytics(start, end);
    }

    @Get('analytics/strategies')
    @ApiOperation({ summary: 'Get strategy performance analytics' })
    @ApiResponse({ status: 200, description: 'Strategy performance data' })
    async getStrategyAnalytics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        return this.bowAdminService.getStrategyAnalytics(start, end);
    }

    @Get('analytics/revenue')
    @ApiOperation({ summary: 'Get Bow-attributed revenue' })
    @ApiResponse({ status: 200, description: 'Revenue attribution data' })
    async getRevenueAnalytics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        return this.bowAdminService.getRevenueAnalytics(start, end);
    }

    @Get('settings')
    @ApiOperation({ summary: 'Get Bow configuration settings' })
    @ApiResponse({ status: 200, description: 'Current Bow settings' })
    async getBowSettings() {
        return this.bowAdminService.getBowSettings();
    }

    @Put('settings')
    @ApiOperation({ summary: 'Update Bow configuration settings' })
    @ApiResponse({ status: 200, description: 'Settings updated successfully' })
    async updateBowSettings(@Body() settings: any) {
        return this.bowAdminService.updateBowSettings(settings);
    }

    @Post('kill-switch/:actionType')
    @ApiOperation({ summary: 'Enable/disable specific Bow action types' })
    @ApiResponse({ status: 200, description: 'Kill switch updated' })
    async toggleActionType(@Param('actionType') actionType: string, @Body() body: { enabled: boolean }) {
        return this.bowAdminService.toggleActionType(actionType, body.enabled);
    }

    @Post('kill-switch/category/:categoryId')
    @ApiOperation({ summary: 'Enable/disable Bow actions for specific category' })
    @ApiResponse({ status: 200, description: 'Category kill switch updated' })
    async toggleCategoryActions(@Param('categoryId') categoryId: string, @Body() body: { enabled: boolean }) {
        return this.bowAdminService.toggleCategoryActions(categoryId, body.enabled);
    }

    @Post('kill-switch/vendor/:vendorId')
    @ApiOperation({ summary: 'Enable/disable Bow actions for specific vendor' })
    @ApiResponse({ status: 200, description: 'Vendor kill switch updated' })
    async toggleVendorActions(@Param('vendorId') vendorId: string, @Body() body: { enabled: boolean }) {
        return this.bowAdminService.toggleVendorActions(vendorId, body.enabled);
    }

    @Post('emergency-shutdown')
    @ApiOperation({ summary: 'Emergency shutdown of all Bow auto-actions' })
    @ApiResponse({ status: 200, description: 'Emergency shutdown activated' })
    async emergencyShutdown() {
        return this.bowAdminService.emergencyShutdown();
    }

    @Post('emergency-restart')
    @ApiOperation({ summary: 'Restart Bow auto-actions after emergency shutdown' })
    @ApiResponse({ status: 200, description: 'Bow auto-actions restarted' })
    async emergencyRestart() {
        return this.bowAdminService.emergencyRestart();
    }

    @Get('queue-status')
    @ApiOperation({ summary: 'Get BullMQ queue status for Bow processing' })
    @ApiResponse({ status: 200, description: 'Queue status information' })
    async getQueueStatus() {
        return this.bowAdminService.getQueueStatus();
    }

    @Get('user/:userId/status')
    @ApiOperation({ summary: 'Get Bow optimization status for specific user' })
    @ApiResponse({ status: 200, description: 'User Bow status' })
    async getUserBowStatus(@Param('userId') userId: string) {
        return this.bowAdminService.getUserBowStatus(userId);
    }

    @Post('user/:userId/reset')
    @ApiOperation({ summary: 'Reset Bow state for specific user' })
    @ApiResponse({ status: 200, description: 'User Bow state reset' })
    async resetUserBowState(@Param('userId') userId: string) {
        return this.bowAdminService.resetUserBowState(userId);
    }

    @Get('experiments')
    @ApiOperation({ summary: 'Get A/B testing experiments status' })
    @ApiResponse({ status: 200, description: 'Experiment status' })
    async getExperiments() {
        return this.bowAdminService.getExperiments();
    }

    @Post('experiments/:experimentId')
    @ApiOperation({ summary: 'Update A/B testing experiment' })
    @ApiResponse({ status: 200, description: 'Experiment updated' })
    async updateExperiment(@Param('experimentId') experimentId: string, @Body() config: any) {
        return this.bowAdminService.updateExperiment(experimentId, config);
    }

    @Get('health')
    @ApiOperation({ summary: 'Get Bow system health status' })
    @ApiResponse({ status: 200, description: 'System health information' })
    async getSystemHealth() {
        return this.bowAdminService.getSystemHealth();
    }
}