import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminAuditService, AuditActionType, AuditResourceType } from './admin-audit.service';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { RequirePermissions } from '../auth/decorators/admin-permissions.decorator';
import { Permission } from '../rbac/admin-permissions.service';

@ApiTags('Admin Audit Logs')
@Controller('admin/audit')
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@ApiBearerAuth()
export class AdminAuditController {
  constructor(private auditService: AdminAuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Search audit logs',
    description: 'Search and filter admin action audit logs',
  })
  @ApiQuery({ name: 'adminId', required: false, description: 'Filter by admin ID' })
  @ApiQuery({ name: 'action', required: false, enum: AuditActionType, description: 'Filter by action type' })
  @ApiQuery({ name: 'resourceType', required: false, enum: AuditResourceType, description: 'Filter by resource type' })
  @ApiQuery({ name: 'resourceId', required: false, description: 'Filter by resource ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'ipAddress', required: false, description: 'Filter by IP address' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async search(
    @Query('adminId') adminId?: string,
    @Query('action') action?: AuditActionType,
    @Query('resourceType') resourceType?: AuditResourceType,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.search({
      adminId,
      action,
      resourceType,
      resourceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      ipAddress,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('recent')
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Get recent audit logs',
    description: 'Get the most recent admin actions for dashboard display',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of logs to return' })
  @ApiResponse({ status: 200, description: 'Recent audit logs retrieved' })
  async getRecent(@Query('limit') limit?: string) {
    return this.auditService.getRecentActions(
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('resource/:resourceType/:resourceId')
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Get resource history',
    description: 'Get all audit logs for a specific resource',
  })
  @ApiResponse({ status: 200, description: 'Resource history retrieved' })
  async getResourceHistory(
    @Query('resourceType') resourceType: AuditResourceType,
    @Query('resourceId') resourceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getResourceHistory(
      resourceType,
      resourceId,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Get('stats')
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Get audit statistics',
    description: 'Get action statistics for a time period',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: 200, description: 'Audit statistics retrieved' })
  async getStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.auditService.getActionStats(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('export')
  @RequirePermissions(Permission.AUDIT_EXPORT)
  @ApiOperation({
    summary: 'Export audit logs',
    description: 'Export audit logs as JSON for compliance or analysis',
  })
  @ApiResponse({ status: 200, description: 'Audit logs exported' })
  async export(
    @Query('adminId') adminId?: string,
    @Query('action') action?: AuditActionType,
    @Query('resourceType') resourceType?: AuditResourceType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.exportLogs({
      adminId,
      action,
      resourceType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
