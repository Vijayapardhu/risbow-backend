import { Controller, Post, Body, UseGuards, Request, InternalServerErrorException, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Idempotent } from '../idempotency/idempotency.decorator';

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
    @Idempotent({ required: true, ttlSeconds: 300 })
    async createPaymentOrder(@Request() req: any, @Body() dto: CreatePaymentOrderDto) {
        const userId = req.user.id;
        const metadata = {
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.paymentsService.createOrder(userId, dto, metadata);
    }

    @Post('verify')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Verify Razorpay payment signature and update status' })
    @ApiResponse({ status: 200, description: 'Payment verified successfully' })
    @ApiResponse({ status: 400, description: 'Invalid signature or payment not found' })
    @Idempotent({ required: true, ttlSeconds: 600 })
    async verifyPayment(@Request() req: any, @Body() dto: VerifyPaymentDto) {
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

    // === Vendor Onboarding Payment Endpoints ===

    @Post('vendor-onboarding/create')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create Razorpay order for ₹1000 vendor onboarding fee' })
    @ApiResponse({ status: 201, description: 'Vendor onboarding order created successfully' })
    @ApiResponse({ status: 400, description: 'Payment not required or vendor not found' })
    async createVendorOnboardingOrder(@Request() req: any) {
        const vendorId = req.user.vendor?.id || req.user.id;
        return this.paymentsService.createVendorOnboardingOrder(vendorId);
    }

    @Post('vendor-onboarding/verify')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Verify vendor onboarding payment and update KYC status' })
    @ApiResponse({ status: 200, description: 'Payment verified and vendor status updated to PENDING' })
    @ApiResponse({ status: 400, description: 'Invalid signature or payment failed' })
    async verifyVendorOnboardingPayment(
        @Request() req: any,
        @Body() body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
    ) {
        const vendorId = req.user.vendor?.id || req.user.id;
        return this.paymentsService.verifyVendorOnboardingPayment(
            body.razorpay_order_id,
            body.razorpay_payment_id,
            body.razorpay_signature,
            vendorId
        );
    }
}
