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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutDto = exports.PaymentMode = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var PaymentMode;
(function (PaymentMode) {
    PaymentMode["COD"] = "COD";
    PaymentMode["ONLINE"] = "ONLINE";
})(PaymentMode || (exports.PaymentMode = PaymentMode = {}));
class CheckoutDto {
}
exports.CheckoutDto = CheckoutDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PaymentMode, example: 'ONLINE', description: 'Payment mode: ONLINE (Razorpay) or COD' }),
    (0, class_validator_1.IsEnum)(PaymentMode),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CheckoutDto.prototype, "paymentMode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'addr_123456', description: 'ID of the shipping address' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CheckoutDto.prototype, "shippingAddressId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Leave at front door', description: 'Optional delivery notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckoutDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'gift_123456', description: 'Optional gift SKU ID to include with order' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckoutDto.prototype, "giftId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'SAVE50', description: 'Optional coupon code to apply discount' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CheckoutDto.prototype, "couponCode", void 0);
//# sourceMappingURL=checkout.dto.js.map