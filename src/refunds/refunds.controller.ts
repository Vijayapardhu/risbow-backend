import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundQueryDto } from './dto/refund-query.dto';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';

/**
 * RefundsController — WRITE OPERATIONS STRUCTURALLY BLOCKED
 * 
 * RISBOW enforces a replacement-only return policy.
 * Read endpoints are retained for historical audit access.
 * All write endpoints return 501 Not Implemented.
 */
@Controller('admin/refunds')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  findAll(@Query() query: RefundQueryDto) {
    return this.refundsService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.refundsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refundsService.findOne(id);
  }

  /**
   * BLOCKED: Direct refund creation violates replacement-only policy.
   */
  @Post()
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  create() {
    return this.refundsService.create();
  }

  /**
   * BLOCKED: Refund processing violates replacement-only policy.
   */
  @Post(':id/process')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  processRefund() {
    return this.refundsService.processRefund();
  }

  /**
   * BLOCKED: Refund rejection implies refund processing exists.
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  rejectRefund() {
    return this.refundsService.rejectRefund();
  }
}
