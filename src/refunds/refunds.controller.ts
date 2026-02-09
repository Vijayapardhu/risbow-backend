import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundQueryDto } from './dto/refund-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * RefundsController — WRITE OPERATIONS STRUCTURALLY BLOCKED
 * 
 * RISBOW enforces a replacement-only return policy.
 * Read endpoints are retained for historical audit access.
 * All write endpoints return 501 Not Implemented.
 */
@Controller('admin/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
