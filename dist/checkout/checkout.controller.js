"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutController = void 0;
const common_1 = require("@nestjs/common");
const checkout_service_1 = require("./checkout.service");
const checkout_dto_1 = require("./dto/checkout.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
const gifts_service_1 = require("../gifts/gifts.service");
const coupons_service_1 = require("../coupons/coupons.service");
const gift_dto_1 = require("../gifts/dto/gift.dto");
const coupon_dto_1 = require("../coupons/dto/coupon.dto");
let CheckoutController = class CheckoutController {
    constructor(checkoutService, giftsService, couponsService) {
        this.checkoutService = checkoutService;
        this.giftsService = giftsService;
        this.couponsService = couponsService;
    }
    checkout(req, dto) {
        return this.checkoutService.checkout(req.user.id, dto);
    }
    async selectGift(req, dto) {
        const cart = await this.checkoutService['prisma'].cart.findUnique({
            where: { userId: req.user.id },
            include: { items: { include: { product: true } } }
        });
        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }
        const categoryIds = [...new Set(cart.items.map(item => item.product.categoryId))];
        await this.giftsService.validateGiftSelection(dto.giftId, categoryIds);
        return {
            message: 'Gift selected successfully',
            giftId: dto.giftId,
        };
    }
    async applyCoupon(req, dto) {
        const cart = await this.checkoutService['prisma'].cart.findUnique({
            where: { userId: req.user.id },
            include: { items: { include: { product: true } } }
        });
        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }
        let cartTotal = 0;
        for (const item of cart.items) {
            const price = item.product.offerPrice || item.product.price;
            cartTotal += price * item.quantity;
        }
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
    async removeCoupon(req) {
        return {
            message: 'Coupon removed successfully',
        };
    }
};
exports.CheckoutController = CheckoutController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Process checkout (COD or ONLINE)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Order created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad Request (Empty Cart, Stock Issue)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, checkout_dto_1.CheckoutDto]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "checkout", null);
__decorate([
    (0, common_1.Post)('select-gift'),
    (0, swagger_1.ApiOperation)({
        summary: 'Select gift for checkout',
        description: 'Attach a selected gift to the checkout snapshot. Gift will be added to order on confirmation.'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Gift selected successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Gift not eligible or out of stock' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, gift_dto_1.SelectGiftDto]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "selectGift", null);
__decorate([
    (0, common_1.Post)('apply-coupon'),
    (0, swagger_1.ApiOperation)({
        summary: 'Apply coupon to checkout',
        description: 'Validates and applies a coupon code to the current cart'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Coupon applied successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired coupon' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, coupon_dto_1.ApplyCouponDto]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "applyCoupon", null);
__decorate([
    (0, common_1.Delete)('remove-coupon'),
    (0, swagger_1.ApiOperation)({
        summary: 'Remove applied coupon',
        description: 'Removes the currently applied coupon from checkout'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Coupon removed successfully' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "removeCoupon", null);
exports.CheckoutController = CheckoutController = __decorate([
    (0, swagger_1.ApiTags)('Checkout'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('checkout'),
    __metadata("design:paramtypes", [checkout_service_1.CheckoutService,
        gifts_service_1.GiftsService,
        coupons_service_1.CouponsService])
], CheckoutController);
//# sourceMappingURL=checkout.controller.js.map