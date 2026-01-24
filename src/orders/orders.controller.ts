import { Controller, Get, Post, Patch, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Idempotent } from '../idempotency/idempotency.decorator';

import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PackingProofService } from '../vendor-orders/packing-proof.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
    /*
        @Post(':id/return')
        @UseGuards(JwtAuthGuard)
        @ApiOperation({ summary: 'Request order return (replacement only)' })
        @ApiResponse({ status: 200, description: 'Return requested, replacement will be processed' })
        async requestReturn(@Request() req, @Param('id') orderId: string, @Body('reason') reason: string) {
            return this.ordersService.requestOrderReturn(orderId, req.user.id, reason);
        }

        @Post(':id/replace')
        @UseGuards(JwtAuthGuard)
        @ApiOperation({ summary: 'Request order replacement' })
        @ApiResponse({ status: 200, description: 'Replacement requested' })
        async requestReplacement(@Request() req, @Param('id') orderId: string, @Body('reason') reason: string) {
            return this.ordersService.requestOrderReplacement(orderId, req.user.id, reason);
        }
    */
    constructor(
        private readonly ordersService: OrdersService,
        private readonly packingProof: PackingProofService,
    ) { }

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
    @Idempotent({ required: true, ttlSeconds: 600 })
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

    @Post(':id/cancel')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Cancel my order (customer)' })
    async cancel(@Request() req, @Param('id') orderId: string) {
        return this.ordersService.cancelOrder(req.user.id, orderId);
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


    // Admin POS order creation: not exposed yet (requires full money+audit workflow)


    // --- LIFECYCLE ENDPOINTS ---


    // Cancel order is supported via POST /orders/:id/cancel


    @Patch(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
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
        @Request() req,
        @Param('id') id: string,
        @Body('status') status: any,
        @Body('notes') notes?: string,
    ) {
        return this.ordersService.updateOrderStatus(id, status, req.user?.id, req.user?.role, notes);
    }

    @Get(':id/tracking')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get order tracking info (awb/courier)' })
    async tracking(@Request() req, @Param('id') orderId: string) {
        return this.ordersService.getTracking(req.user.id, orderId);
    }

    @Get(':id/packing-video')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get signed packing video URL (customer)'})
    async getPackingVideo(@Request() req, @Param('id') orderId: string) {
        return this.packingProof.getSignedVideoUrlForCustomer({ userId: req.user.id, orderId });
    }
}
