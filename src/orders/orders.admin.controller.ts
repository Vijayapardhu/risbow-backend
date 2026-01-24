import { Controller, Get, Patch, Query, Param, Body, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrderStatus } from '@prisma/client';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class OrdersAdminController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    async findAll(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('search') search: string,
        @Query('status') status: OrderStatus
    ) {
        return this.ordersService.findAllOrders({
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search,
            status
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.ordersService.getOrderDetail(id);
    }

    @Patch(':id/status')
    async updateStatus(
        @Request() req,
        @Param('id') id: string,
        @Body('status') status: OrderStatus,
        @Body('notes') notes?: string,
    ) {
        return this.ordersService.updateOrderStatus(id, status, req.user?.id, req.user?.role, notes);
    }
}
