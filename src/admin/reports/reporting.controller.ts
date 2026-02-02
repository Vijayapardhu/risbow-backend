import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportingService, ReportType } from './reporting.service';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { RequirePermissions } from '../auth/decorators/admin-permissions.decorator';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditActionType, AuditResourceType } from '../audit/admin-audit.service';
import { Permission } from '../rbac/admin-permissions.service';
import { IsEnum, IsDateString, IsOptional, IsObject, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTOs
class GenerateReportDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  groupBy?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

@ApiTags('Reports & Analytics')
@Controller('admin/reports')
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@ApiBearerAuth()
export class ReportingController {
  constructor(private reportingService: ReportingService) {}

  @Get('types')
  @RequirePermissions(Permission.REPORT_VIEW)
  @ApiOperation({
    summary: 'Get available report types',
    description: 'Get list of all available report types',
  })
  @ApiResponse({ status: 200, description: 'Report types retrieved' })
  getReportTypes() {
    return Object.values(ReportType);
  }

  @Post('generate')
  @RequirePermissions(Permission.REPORT_CREATE)
  @AuditLog({
    action: AuditActionType.REPORT_GENERATED,
    resourceType: AuditResourceType.REPORT,
    includeBody: true,
  })
  @ApiOperation({
    summary: 'Generate report',
    description: 'Generate a report based on type and parameters',
  })
  @ApiResponse({ status: 200, description: 'Report generated' })
  async generateReport(@Body() dto: GenerateReportDto) {
    return this.reportingService.generateReport({
      type: dto.type,
      dateRange: {
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      filters: dto.filters,
      groupBy: dto.groupBy,
      limit: dto.limit,
    });
  }

  @Post('export')
  @RequirePermissions(Permission.REPORT_EXPORT)
  @AuditLog({
    action: AuditActionType.REPORT_EXPORTED,
    resourceType: AuditResourceType.REPORT,
    includeBody: true,
  })
  @ApiOperation({
    summary: 'Export report',
    description: 'Generate and export a report as JSON or CSV',
  })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiResponse({ status: 200, description: 'Report exported' })
  async exportReport(
    @Body() dto: GenerateReportDto,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res: Response,
  ) {
    const data = await this.reportingService.exportReport(
      {
        type: dto.type,
        dateRange: {
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        },
        filters: dto.filters,
        groupBy: dto.groupBy,
        limit: dto.limit,
      },
      format,
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${dto.type}_${dto.startDate}_${dto.endDate}.csv"`,
      );
      res.send(data);
    } else {
      res.json(data);
    }
  }

  // Quick access endpoints for common reports

  @Get('dashboard')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Get dashboard data',
    description: 'Get overview data for the admin dashboard',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    return this.reportingService.generateReport({
      type: ReportType.PLATFORM_OVERVIEW,
      dateRange: { startDate: start, endDate: end },
    });
  }

  @Get('sales-summary')
  @RequirePermissions(Permission.REPORT_VIEW)
  @ApiOperation({
    summary: 'Get sales summary',
    description: 'Get quick sales summary for specified period',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Sales summary retrieved' })
  async getSalesSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.generateReport({
      type: ReportType.SALES_SUMMARY,
      dateRange: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
  }

  @Get('top-vendors')
  @RequirePermissions(Permission.REPORT_VIEW)
  @ApiOperation({
    summary: 'Get top vendors',
    description: 'Get top performing vendors by revenue',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top vendors retrieved' })
  async getTopVendors(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportingService.generateReport({
      type: ReportType.SALES_BY_VENDOR,
      dateRange: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get('top-products')
  @RequirePermissions(Permission.REPORT_VIEW)
  @ApiOperation({
    summary: 'Get top products',
    description: 'Get top selling products by revenue',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top products retrieved' })
  async getTopProducts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportingService.generateReport({
      type: ReportType.SALES_BY_PRODUCT,
      dateRange: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('low-stock')
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiOperation({
    summary: 'Get low stock products',
    description: 'Get products with stock below threshold',
  })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Low stock products retrieved' })
  async getLowStock(@Query('threshold') threshold?: string) {
    return this.reportingService.generateReport({
      type: ReportType.LOW_STOCK,
      dateRange: {
        startDate: new Date(),
        endDate: new Date(),
      },
      filters: { threshold: threshold ? parseInt(threshold, 10) : 10 },
    });
  }

  @Get('user-growth')
  @RequirePermissions(Permission.DASHBOARD_ANALYTICS)
  @ApiOperation({
    summary: 'Get user growth',
    description: 'Get user growth statistics',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'User growth retrieved' })
  async getUserGrowth(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.reportingService.generateReport({
      type: ReportType.USER_GROWTH,
      dateRange: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      groupBy: groupBy || 'day',
    });
  }

  @Get('revenue')
  @RequirePermissions(Permission.DASHBOARD_ANALYTICS)
  @ApiOperation({
    summary: 'Get revenue summary',
    description: 'Get platform revenue summary',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Revenue summary retrieved' })
  async getRevenue(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.generateReport({
      type: ReportType.REVENUE_SUMMARY,
      dateRange: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
  }
}
