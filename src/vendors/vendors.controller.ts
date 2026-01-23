import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { RegisterVendorDto } from './dto/vendor.dto';
import { PurchaseBannerDto } from './dto/purchase-banner.dto';
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

    @Post('kyc')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update Vendor KYC details' })
    @ApiResponse({ status: 200, description: 'KYC updated successfully' })
    async updateKyc(@Body() dto: any, @Request() req) {
        return this.vendorsService.updateKycStatus(req.user.id, req.user.id, dto);
    }
}
