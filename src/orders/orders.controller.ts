import { Controller, Get, Post, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
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
    async getOrderDetails(@Request() req, @Param('id') orderId: string) {
        return this.ordersService.getOrderDetails(req.user.id, orderId);
    }

    @Post('checkout')
    @UseGuards(JwtAuthGuard)
    async checkout(@Request() req, @Body() dto: CheckoutDto) {
        return this.ordersService.createCheckout(req.user.id, dto);
    }

    @Post('confirm')
    async confirm(@Body() dto: ConfirmOrderDto) {
        // Typically webhook, but can be called from client success handler for simplicity in Phase 1
        return this.ordersService.confirmOrder(dto);
    }

    @Post(':id/gift')
    @UseGuards(JwtAuthGuard)
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
    async createOrder(@Request() req, @Body() orderData: any) {
        return this.ordersService.createOrder(req.user.id, orderData);
    }
}
