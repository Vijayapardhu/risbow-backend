import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { OrdersService } from '../orders/orders.service';
import { AdminRole, OrderStatus } from '@prisma/client';

/**
 * Backward-compatible alias routes for older admin clients.
 * Prefer using `/admin/orders`.
 */
@Controller('orders/admin')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class AdminOrdersAliasController {
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
