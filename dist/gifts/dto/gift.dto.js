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
exports.EligibleGiftsQueryDto = exports.GiftResponseDto = exports.SelectGiftDto = exports.UpdateGiftDto = exports.CreateGiftDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateGiftDto {
}
exports.CreateGiftDto = CreateGiftDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Premium Headphones', description: 'Gift title' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGiftDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Initial stock quantity' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateGiftDto.prototype, "stock", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500, description: 'Cost of the gift in INR' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateGiftDto.prototype, "cost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: ['cat_electronics', 'cat_mobiles'],
        description: 'Array of category IDs eligible for this gift',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateGiftDto.prototype, "eligibleCategories", void 0);
class UpdateGiftDto {
}
exports.UpdateGiftDto = UpdateGiftDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Premium Headphones - Updated' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGiftDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateGiftDto.prototype, "stock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 600 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateGiftDto.prototype, "cost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['cat_electronics'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateGiftDto.prototype, "eligibleCategories", void 0);
class SelectGiftDto {
}
exports.SelectGiftDto = SelectGiftDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'gift_123', description: 'Gift SKU ID to select' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SelectGiftDto.prototype, "giftId", void 0);
class GiftResponseDto {
}
exports.GiftResponseDto = GiftResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'gift_123' }),
    __metadata("design:type", String)
], GiftResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Premium Headphones' }),
    __metadata("design:type", String)
], GiftResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100 }),
    __metadata("design:type", Number)
], GiftResponseDto.prototype, "stock", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500 }),
    __metadata("design:type", Number)
], GiftResponseDto.prototype, "cost", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['cat_electronics', 'cat_mobiles'] }),
    __metadata("design:type", Array)
], GiftResponseDto.prototype, "eligibleCategories", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Whether this gift is eligible for current cart' }),
    __metadata("design:type", Boolean)
], GiftResponseDto.prototype, "isEligible", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], GiftResponseDto.prototype, "createdAt", void 0);
class EligibleGiftsQueryDto {
}
exports.EligibleGiftsQueryDto = EligibleGiftsQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'cat_electronics,cat_mobiles',
        description: 'Comma-separated category IDs from cart',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EligibleGiftsQueryDto.prototype, "categories", void 0);
//# sourceMappingURL=gift.dto.js.map