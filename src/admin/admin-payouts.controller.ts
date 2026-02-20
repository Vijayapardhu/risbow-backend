import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminPayoutsService, ProcessPayoutDto, PayoutFilters } from './admin-payouts.service';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { AdminRole, PayoutStatus } from '@prisma/client';

@ApiTags('Admin - Payouts')
@Controller('admin/payouts')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.FINANCE_ADMIN, AdminRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminPayoutsController {
  constructor(private readonly payoutsService: AdminPayoutsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all payouts',
    description: 'Returns paginated list of payouts with optional filters',
  })
  @ApiResponse({ status: 200, description: 'List of payouts' })
  async getPayouts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: PayoutStatus,
    @Query('vendorId') vendorId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: PayoutFilters = {};
    if (status) filters.status = status;
    if (vendorId) filters.vendorId = vendorId;
    if (search) filters.search = search;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.payoutsService.getPayouts(
      filters,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get payout statistics',
    description: 'Returns dashboard statistics for payouts',
  })
  @ApiResponse({ status: 200, description: 'Payout statistics' })
  async getStats() {
    return this.payoutsService.getPayoutStats();
  }

  @Get('pending-summary')
  @ApiOperation({
    summary: 'Get pending payouts summary',
    description: 'Returns all pending payouts with totals',
  })
  @ApiResponse({ status: 200, description: 'Pending payouts summary' })
  async getPendingSummary() {
    return this.payoutsService.getPendingPayoutsSummary();
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Get payout trends',
    description: 'Returns payout trends for charting',
  })
  @ApiResponse({ status: 200, description: 'Payout trends data' })
  async getTrends(@Query('days') days: string = '30') {
    return this.payoutsService.getPayoutTrends(parseInt(days));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payout by ID',
    description: 'Returns detailed information about a specific payout',
  })
  @ApiParam({ name: 'id', description: 'Payout ID' })
  @ApiResponse({ status: 200, description: 'Payout details' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  async getPayoutById(@Param('id') id: string) {
    return this.payoutsService.getPayoutById(id);
  }

  @Post(':id/process')
  @ApiOperation({
    summary: 'Process a payout',
    description: 'Mark a payout as completed with transaction ID',
  })
  @ApiParam({ name: 'id', description: 'Payout ID' })
  @ApiResponse({ status: 200, description: 'Payout processed successfully' })
  async processPayout(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ProcessPayoutDto,
  ) {
    return this.payoutsService.processPayout(req.user.id, {
      ...dto,
      payoutId: id,
    });
  }

  @Post(':id/processing')
  @ApiOperation({
    summary: 'Mark payout as processing',
    description: 'Mark a pending payout as being processed',
  })
  @ApiParam({ name: 'id', description: 'Payout ID' })
  @ApiResponse({ status: 200, description: 'Payout marked as processing' })
  async markAsProcessing(@Param('id') id: string) {
    return this.payoutsService.markAsProcessing(id);
  }

  @Post(':id/fail')
  @ApiOperation({
    summary: 'Fail a payout',
    description: 'Mark a payout as failed',
  })
  @ApiParam({ name: 'id', description: 'Payout ID' })
  @ApiResponse({ status: 200, description: 'Payout marked as failed' })
  async failPayout(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.payoutsService.failPayout(id, reason);
  }
}
