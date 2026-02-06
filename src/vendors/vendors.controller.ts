import { Controller, Post, Body, Get, UseGuards, Request, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { VendorsService } from './vendors.service';
import { RegisterVendorDto } from './dto/vendor.dto';
import { PurchaseBannerDto } from './dto/purchase-banner.dto';
import { UpdateAutoClearanceSettingsDto } from './dto/update-auto-clearance-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { VendorScoringService } from './vendor-scoring.service';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
    constructor(
        private readonly vendorsService: VendorsService,
        private readonly scoringService: VendorScoringService
    ) { }

    @Post('admin/recalculate-scores')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Trigger vendor scoring engine manually' })
    async recalculateScores() {
        return this.scoringService.calculateAllScores();
    }

    @Post('register')
    async register(@Body() dto: RegisterVendorDto) {
        return this.vendorsService.register(dto);
    }

    @Get('nearby')
    @ApiOperation({ summary: 'Get nearby vendors (hyperlocal discovery)' })
    async nearby(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radiusKm') radiusKm: string,
        @Query('openNowOnly') openNowOnly?: string,
    ) {
        return this.vendorsService.getNearbyVendors({
            lat: Number(lat),
            lng: Number(lng),
            radiusKm: Number(radiusKm) || 10,
            openNowOnly: openNowOnly === 'true' || openNowOnly === '1',
        });
    }

    @Get('dashboard')
    @UseGuards(JwtAuthGuard)
    async getDashboard(@Request() req) {
        const vendorId = req.user.id;
        const [stats, sales, products, customers] = await Promise.all([
            this.vendorsService.getVendorStats(vendorId),
            this.vendorsService.getSalesAnalytics(vendorId, 30),
            this.vendorsService.getProductAnalytics(vendorId),
            this.vendorsService.getCustomerAnalytics(vendorId),
        ]);

        return { stats, sales, products, customers };
    }

    @Get('analytics/sales')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get vendor sales analytics' })
    @ApiResponse({ status: 200, description: 'Sales analytics data' })
    async getSalesAnalytics(@Request() req) {
        return this.vendorsService.getSalesAnalytics(req.user.id);
    }

    @Get('analytics/products')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get vendor product analytics' })
    @ApiResponse({ status: 200, description: 'Product analytics data' })
    async getProductAnalytics(@Request() req) {
        return this.vendorsService.getProductAnalytics(req.user.id);
    }

    @Get('analytics/customers')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get vendor customer analytics' })
    @ApiResponse({ status: 200, description: 'Customer analytics data' })
    async getCustomerAnalytics(@Request() req) {
        return this.vendorsService.getCustomerAnalytics(req.user.id);
    }

    @Get('analytics/traffic')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get vendor traffic and funnel analytics' })
    @ApiResponse({ status: 200, description: 'Traffic analytics data' })
    async getTrafficAnalytics(@Request() req, @Query('days') days?: string) {
        const period = days ? Math.max(7, Math.min(90, parseInt(days, 10))) : 30;
        return this.vendorsService.getTrafficAnalytics(req.user.id, period);
    }

    @Post('promotions/banner')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Purchase a banner slot' })
    async purchaseBanner(@Request() req, @Body() dto: PurchaseBannerDto) {
        return this.vendorsService.purchaseBanner(req.user.id, {
            ...dto,
            startDate: new Date(dto.startDate),
            endDate: new Date(dto.endDate)
        });
    }

    @Patch('settings/auto-clearance')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
    @ApiOperation({ summary: 'Update auto-clearance settings (threshold days and discount %)' })
    @ApiResponse({ status: 200, description: 'Auto-clearance settings updated successfully' })
    async updateAutoClearanceSettings(
      @Request() req: any,
      @Body() dto: UpdateAutoClearanceSettingsDto,
    ) {
      return this.vendorsService.updateAutoClearanceSettings(req.user.id, dto);
    }

    @Get('settings/auto-clearance')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
    @ApiOperation({ summary: 'Get current auto-clearance settings' })
    @ApiResponse({ status: 200, description: 'Auto-clearance settings' })
    async getAutoClearanceSettings(@Request() req: any) {
      return this.vendorsService.getAutoClearanceSettings(req.user.id);
    }

    @Post('kyc')
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: { limit: 2, ttl: 60000 } })
    @ApiOperation({ summary: 'Update Vendor KYC details' })
    @ApiResponse({ status: 200, description: 'KYC updated successfully' })
    async updateKyc(@Body() dto: any, @Request() req) {
        return this.vendorsService.updateKycStatus(req.user.id, req.user.id, dto);
    }

    @Post('compliance-fee')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR')
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @ApiOperation({ summary: 'Create a non-GST compliance fee payment intent' })
    @ApiResponse({ status: 201, description: 'Compliance fee payment intent created' })
    async createComplianceFee(@Request() req) {
        return this.vendorsService.createNonGstCompliancePayment(req.user.id);
    }
}
