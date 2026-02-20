import { Controller, Post, Delete, Body, UseGuards, Request, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { GiftsService } from '../gifts/gifts.service';
import { CouponsService } from '../coupons/coupons.service';
import { SelectGiftDto } from '../gifts/dto/gift.dto';
import { ApplyCouponDto } from '../coupons/dto/coupon.dto';

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
    constructor(
        private readonly checkoutService: CheckoutService,
        private readonly giftsService: GiftsService,
        private readonly couponsService: CouponsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Process checkout (COD or ONLINE)' })
    @ApiResponse({ status: 201, description: 'Order created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request (Empty Cart, Stock Issue)' })
    @Throttle({ default: { limit: 2, ttl: 60000 } }) // Limit to 2 checkout attempts per minute
    checkout(@Request() req: any, @Body() dto: CheckoutDto) {
        const metadata = {
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
        return this.checkoutService.checkout(req.user.id, dto, metadata);
    }

    @Get('delivery-options')
    @ApiOperation({ summary: 'Get delivery eligibility + available slots per vendor for current cart' })
    async getDeliveryOptions(@Request() req: any, @Query('shippingAddressId') shippingAddressId: string) {
        return this.checkoutService.getDeliveryOptionsForCart(req.user.id, shippingAddressId);
    }

    @Post('select-gift')
    @ApiOperation({
        summary: 'Select gift for checkout',
        description: 'Attach a selected gift to the checkout snapshot. Gift will be added to order on confirmation.'
    })
    @ApiResponse({ status: 200, description: 'Gift selected successfully' })
    @ApiResponse({ status: 400, description: 'Gift not eligible or out of stock' })
    async selectGift(@Request() req: any, @Body() dto: SelectGiftDto) {
        // In a real implementation, this would store the gift selection in a session or checkout snapshot
        // For now, we'll just validate the gift selection
        const cart = await this.checkoutService['prisma'].cart.findUnique({
            where: { userId: req.user.id },
            include: { CartItem: { include: { Product: true } } }
        });

        if (!cart || cart.CartItem.length === 0) {
            throw new Error('Cart is empty');
        }

        // Extract category IDs from cart
        const categoryIds = [...new Set(cart.CartItem.map(item => item.Product.categoryId))];

        // Validate gift selection
        await this.giftsService.validateGiftSelection(dto.giftId, categoryIds);

        return {
            message: 'Gift selected successfully',
            giftId: dto.giftId,
        };
    }

    @Post('apply-coupon')
    @ApiOperation({
        summary: 'Apply coupon to checkout',
        description: 'Validates and applies a coupon code to the current cart'
    })
    @ApiResponse({ status: 200, description: 'Coupon applied successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired coupon' })
    async applyCoupon(@Request() req: any, @Body() dto: ApplyCouponDto) {
        // Get cart total
        const cart = await this.checkoutService['prisma'].cart.findUnique({
            where: { userId: req.user.id },
            include: { CartItem: { include: { Product: true } } }
        });

        if (!cart || cart.CartItem.length === 0) {
            throw new Error('Cart is empty');
        }

        // Calculate cart total
        let cartTotal = 0;
        for (const item of cart.CartItem) {
            const price = item.Product.offerPrice || item.Product.price;
            cartTotal += price * item.quantity;
        }

        // Validate coupon
        const validation = await this.couponsService.validateCoupon({
            code: dto.code,
            cartTotal,
        });

        if (!validation.isValid) {
            throw new Error(validation.message);
        }

        return {
            message: validation.message || 'Coupon applied successfully',
            isValid: validation.isValid,
            discountAmount: validation.discountAmount,
            finalAmount: validation.finalAmount,
            coupon: validation.coupon,
        };
    }

    @Delete('remove-coupon')
    @ApiOperation({
        summary: 'Remove applied coupon',
        description: 'Removes the currently applied coupon from checkout'
    })
    @ApiResponse({ status: 200, description: 'Coupon removed successfully' })
    async removeCoupon(@Request() req: any) {
        // In a real implementation, this would remove the coupon from session/checkout snapshot
        return {
            message: 'Coupon removed successfully',
        };
    }
}
