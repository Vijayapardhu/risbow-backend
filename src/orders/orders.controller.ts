import { Controller, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto, ConfirmOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

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
}
