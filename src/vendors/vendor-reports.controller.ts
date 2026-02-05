import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Header,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorReportsService } from './vendor-reports.service';
import {
  SalesReportQueryDto,
  OrdersReportQueryDto,
  InventoryReportQueryDto,
  DateRangeQueryDto,
  SalesReportResponseDto,
  InventoryReportResponseDto,
  RevenueReportResponseDto,
  ProductPerformanceResponseDto,
  GroupByPeriod,
  ExportFormat,
} from './dto/vendor-report.dto';

@ApiTags('Vendor Reports')
@ApiBearerAuth()
@Controller('vendors/reports')
@UseGuards(JwtAuthGuard)
export class VendorReportsController {
  constructor(private readonly reportsService: VendorReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report grouped by day/week/month' })
  @ApiResponse({
    status: 200,
    description: 'Sales report with summary',
    type: SalesReportResponseDto,
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: GroupByPeriod,
    description: 'Group by period: day, week, or month',
  })
  async getSalesReport(
    @Request() req,
    @Query() query: SalesReportQueryDto,
  ): Promise<SalesReportResponseDto> {
    return this.reportsService.getSalesReport(req.user.id, query);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get orders report with optional CSV export' })
  @ApiResponse({
    status: 200,
    description: 'Orders report data (JSON or CSV)',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ExportFormat,
    description: 'Export format: json or csv',
  })
  async getOrdersReport(
    @Request() req,
    @Query() query: OrdersReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reportsService.getOrdersReport(req.user.id, query);

    if (query.format === 'csv' && result.csv) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="orders-report-${new Date().toISOString().split('T')[0]}.csv"`,
      );
      return result.csv;
    }

    return result;
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory report with stock status' })
  @ApiResponse({
    status: 200,
    description: 'Inventory report with summary',
    type: InventoryReportResponseDto,
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'stockStatus',
    required: false,
    type: String,
    description: 'Filter by stock status: low, out, in_stock',
  })
  async getInventoryReport(
    @Request() req,
    @Query() query: InventoryReportQueryDto,
  ): Promise<InventoryReportResponseDto> {
    return this.reportsService.getInventoryReport(req.user.id, query);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue breakdown (gross, commission, net)' })
  @ApiResponse({
    status: 200,
    description: 'Revenue breakdown report',
    type: RevenueReportResponseDto,
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
  })
  async getRevenueReport(
    @Request() req,
    @Query() query: DateRangeQueryDto,
  ): Promise<RevenueReportResponseDto> {
    return this.reportsService.getRevenueReport(req.user.id, query);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get product performance report' })
  @ApiResponse({
    status: 200,
    description: 'Product performance report',
    type: ProductPerformanceResponseDto,
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'End date (ISO 8601)',
  })
  async getProductsReport(
    @Request() req,
    @Query() query: DateRangeQueryDto,
  ): Promise<ProductPerformanceResponseDto> {
    return this.reportsService.getProductsReport(req.user.id, query);
  }
}
