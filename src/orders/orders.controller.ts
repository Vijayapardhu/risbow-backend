import { Controller, Get, Post, Patch, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user\'s orders' })
    async getMyOrders(
        @Request() req,
        @Query('page') page: string,
        @Query('limit') limit: string
    ) {
        return this.ordersService.getUserOrders(
            req.user.id,
            Number(page) || 1,
            Number(limit) || 10
        );
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get order details by ID' })
    async getOrderDetails(@Request() req, @Param('id') orderId: string) {
        return this.ordersService.getOrderDetails(req.user.id, orderId);
    }

    @Post('checkout')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Complete checkout (Create Order)' })
    async checkout(@Request() req, @Body() dto: CheckoutDto) {
        return this.ordersService.createCheckout(req.user.id, dto);
    }

    @Post('confirm')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Confirm Razorpay payment' })
    async confirm(@Body() dto: ConfirmOrderDto) {
        // Typically webhook, but can be called from client success handler for simplicity in Phase 1
        return this.ordersService.confirmOrder(dto);
    }

    @Post(':id/gift')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Add a free gift to an eligible order' })
    async addGift(
        @Param('id') orderId: string,
        @Body('giftId') giftId: string,
        @Request() req
    ) {
        return this.ordersService.addGiftToOrder(orderId, req.user.id, giftId);
    }

    // Simple order creation for COD
    @Post('create')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create direct order (e.g. COD)' })
    async createOrder(@Request() req, @Body() orderData: any) {
        return this.ordersService.createOrder(req.user.id, orderData);
    }

    // --- ADMIN ENDPOINTS ---

    @Get('admin/all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Admin: Get all orders' })
    async getAllAdminOrders(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('search') search: string,
        @Query('status') status: any
    ) {
        return this.ordersService.findAllOrders({
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search,
            status: status === 'ALL' ? undefined : status
        });
    }

    @Get('admin/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Admin: Get order details' })
    async getAdminOrderDetails(@Param('id') orderId: string) {
        return this.ordersService.getOrderDetail(orderId);
    }


    // Admin POS order creation disabled: Service method not implemented


    // --- LIFECYCLE ENDPOINTS ---


    // Cancel order endpoint disabled: Service method not implemented


    @Patch(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN', 'VENDOR')
    @ApiOperation({ summary: 'Update order status (Admin/Vendor)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'SHIPPED', enum: ['PACKED', 'SHIPPED', 'DELIVERED', 'PAID'] },
                notes: { type: 'string', example: 'Shipped via BlueDart' }
            }
        }
    })
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: any
    ) {
        return this.ordersService.updateOrderStatus(id, status);
    }


    // Order tracking endpoint disabled: Service method not implemented
}
