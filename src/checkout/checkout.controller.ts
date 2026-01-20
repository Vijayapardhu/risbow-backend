import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
    constructor(private readonly checkoutService: CheckoutService) { }

    @Post()
    @ApiOperation({ summary: 'Process checkout (COD or ONLINE)' })
    @ApiResponse({ status: 201, description: 'Order created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request (Empty Cart, Stock Issue)' })
    checkout(@Request() req, @Body() dto: CheckoutDto) {
        return this.checkoutService.checkout(req.user.id, dto);
    }
}
