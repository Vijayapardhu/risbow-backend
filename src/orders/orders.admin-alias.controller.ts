import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

/**
 * Backward-compatible alias routes for older admin clients.
 * Prefer using `/admin/orders`.
 */
@Controller('orders/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class OrdersAdminAliasController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('all')
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('status') status: OrderStatus,
  ) {
    return this.ordersService.findAllOrders({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search,
      status,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.getOrderDetail(id);
  }
}

