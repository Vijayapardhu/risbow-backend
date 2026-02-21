import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorsService } from './vendors.service';

@ApiTags('Vendor Dashboard')
@Controller('vendor-dashboard')
@UseGuards(JwtAuthGuard)
export class VendorDashboardController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get vendor dashboard stats' })
  async getStats(@Request() req: any, @Query('period') period?: string) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.vendorsService.getVendorStats(vendorId);
  }
}

@ApiTags('Vendor Analytics')
@Controller('vendor-analytics')
@UseGuards(JwtAuthGuard)
export class VendorAnalyticsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get analytics summary' })
  async getSummary(@Request() req: any, @Query('range') range?: string) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.vendorsService.getAnalyticsSummary(vendorId, range || '30d');
  }

  @Get('charts')
  @ApiOperation({ summary: 'Get analytics charts' })
  async getCharts(@Request() req: any, @Query('range') range?: string) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.vendorsService.getAnalyticsCharts(vendorId, range || '30d');
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top products' })
  async getTopProducts(@Request() req: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.vendorsService.getTopProducts(vendorId);
  }

  @Get('geo-distribution')
  @ApiOperation({ summary: 'Get geo distribution' })
  async getGeoDistribution(@Request() req: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return { data: [], message: 'Geo distribution not implemented' };
  }

  @Get('performance-metrics')
  @ApiOperation({ summary: 'Get performance metrics' })
  async getPerformanceMetrics(@Request() req: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.vendorsService.getPerformanceMetrics(vendorId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export analytics data' })
  async exportData(@Request() req: any, @Query('format') format: string, @Query('range') range?: string) {
    return { message: 'Export not implemented', format, range };
  }
}

@ApiTags('Vendor Reviews')
@Controller('vendor-reviews')
@UseGuards(JwtAuthGuard)
export class VendorReviewsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get vendor reviews' })
  async findAll(@Request() req: any, @Query('limit') limit?: string, @Query('sort') sort?: string) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.vendorsService.getVendorReviews(vendorId, parseInt(limit || '10'), sort);
  }
}

@ApiTags('Vendor Customers')
@Controller('vendor-customers')
@UseGuards(JwtAuthGuard)
export class VendorCustomersController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get vendor customers' })
  async findAll(@Request() req: any, @Query() query: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.vendorsService.getVendorCustomers(vendorId, query);
  }

  @Get(':customerId')
  @ApiOperation({ summary: 'Get customer details' })
  async findOne(@Request() req: any, @Param('customerId') customerId: string) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.vendorsService.getVendorCustomerDetails(vendorId, customerId);
  }

  @Get(':customerId/analytics')
  @ApiOperation({ summary: 'Get customer analytics' })
  async getCustomerAnalytics(@Request() req: any, @Param('customerId') customerId: string) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.vendorsService.getSingleCustomerAnalytics(vendorId, customerId);
  }
}
