import { Controller, Post, Body, UseGuards, Request, InternalServerErrorException, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('create-order')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create a Razorpay order and persist payment intent' })
    @ApiResponse({ status: 201, description: 'Order created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input or order not found' })
    async createPaymentOrder(@Request() req, @Body() dto: CreatePaymentOrderDto) {
        const userId = req.user.id;
        // ...
        return this.paymentsService.createOrder(userId, dto);
    }

    @Post('verify')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Verify Razorpay payment signature and update status' })
    @ApiResponse({ status: 200, description: 'Payment verified successfully' })
    @ApiResponse({ status: 400, description: 'Invalid signature or payment not found' })
    async verifyPayment(@Request() req, @Body() dto: VerifyPaymentDto) {
        const userId = req.user.id;
        return this.paymentsService.verifyPayment(userId, dto);
    }

    @Post('webhook/razorpay')
    @ApiOperation({ summary: 'Handle Razorpay Webhooks (Public)' })
    @ApiResponse({ status: 200, description: 'Webhook processed' })
    async handleWebhook(@Headers('x-razorpay-signature') signature: string, @Req() req: any) {
        // NestJS with rawBody: true puts raw buffer in req.rawBody
        return this.paymentsService.handleWebhook(signature, req.rawBody);
    }
}
