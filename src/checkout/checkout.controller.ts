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
    checkout(@Request() req, @Body() dto: CheckoutDto) {
        return this.checkoutService.checkout(req.user.id, dto);
    }

    @Get('delivery-options')
    @ApiOperation({ summary: 'Get delivery eligibility + available slots per vendor for current cart' })
    async getDeliveryOptions(@Request() req, @Query('shippingAddressId') shippingAddressId: string) {
        return this.checkoutService.getDeliveryOptionsForCart(req.user.id, shippingAddressId);
    }

    @Post('select-gift')
    @ApiOperation({
        summary: 'Select gift for checkout',
        description: 'Attach a selected gift to the checkout snapshot. Gift will be added to order on confirmation.'
    })
    @ApiResponse({ status: 200, description: 'Gift selected successfully' })
    @ApiResponse({ status: 400, description: 'Gift not eligible or out of stock' })
    async selectGift(@Request() req, @Body() dto: SelectGiftDto) {
        // In a real implementation, this would store the gift selection in a session or checkout snapshot
        // For now, we'll just validate the gift selection
        const cart = await this.checkoutService['prisma'].cart.findUnique({
            where: { userId: req.user.id },
            include: { items: { include: { product: true } } }
        });

        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

        // Extract category IDs from cart
        const categoryIds = [...new Set(cart.items.map(item => item.product.categoryId))];

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
    async applyCoupon(@Request() req, @Body() dto: ApplyCouponDto) {
        // Get cart total
        const cart = await this.checkoutService['prisma'].cart.findUnique({
            where: { userId: req.user.id },
            include: { items: { include: { product: true } } }
        });

        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

        // Calculate cart total
        let cartTotal = 0;
        for (const item of cart.items) {
            const price = item.product.offerPrice || item.product.price;
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
            message: 'Coupon applied successfully',
            ...validation,
        };
    }

    @Delete('remove-coupon')
    @ApiOperation({
        summary: 'Remove applied coupon',
        description: 'Removes the currently applied coupon from checkout'
    })
    @ApiResponse({ status: 200, description: 'Coupon removed successfully' })
    async removeCoupon(@Request() req) {
        // In a real implementation, this would remove the coupon from session/checkout snapshot
        return {
            message: 'Coupon removed successfully',
        };
    }
}
