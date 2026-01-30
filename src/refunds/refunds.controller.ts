import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { RefundQueryDto } from './dto/refund-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRefundDto, @CurrentUser('id') adminId: string) {
    return this.refundsService.create(dto, adminId);
  }

  @Post(':id/process')
  processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
    @CurrentUser('id') adminId: string
  ) {
    return this.refundsService.processRefund(id, dto, adminId);
  }

  @Post(':id/reject')
  rejectRefund(
    @Param('id') id: string,
    @Body('rejectionReason') rejectionReason: string,
    @CurrentUser('id') adminId: string
  ) {
    return this.refundsService.rejectRefund(id, rejectionReason, adminId);
  }
}
