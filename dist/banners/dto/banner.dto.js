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
exports.GetActiveBannersQueryDto = exports.BannerResponseDto = exports.TrackBannerDto = exports.UploadBannerCreativeDto = exports.PurchaseBannerDto = exports.UpdateBannerDto = exports.CreateBannerDto = exports.BannerMetadataDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class BannerMetadataDto {
}
exports.BannerMetadataDto = BannerMetadataDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CAROUSEL', description: 'Exact placement inside the page' }),
    __metadata("design:type", String)
], BannerMetadataDto.prototype, "slotKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Position order (0-based)' }),
    __metadata("design:type", Number)
], BannerMetadataDto.prototype, "slotIndex", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 100, description: 'Priority (higher = more important)' }),
    __metadata("design:type", Number)
], BannerMetadataDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Is this a paid banner' }),
    __metadata("design:type", Boolean)
], BannerMetadataDto.prototype, "isPaid", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Analytics data' }),
    __metadata("design:type", Object)
], BannerMetadataDto.prototype, "analytics", void 0);
class CreateBannerDto {
}
exports.CreateBannerDto = CreateBannerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://cdn.example.com/banner.png', description: 'Banner image URL' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBannerDto.prototype, "imageUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '/category/mobiles', description: 'Redirect URL or deep link' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBannerDto.prototype, "redirectUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'HOME', enum: ['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART'], description: 'Page identifier' }),
    (0, class_validator_1.IsEnum)(['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART']),
    __metadata("design:type", String)
], CreateBannerDto.prototype, "slotType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-22T00:00:00Z', description: 'Start date' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateBannerDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-30T23:59:59Z', description: 'End date' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateBannerDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CAROUSEL', description: 'Exact placement key' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBannerDto.prototype, "slotKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Position index' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBannerDto.prototype, "slotIndex", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 100, description: 'Priority level' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBannerDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Is banner active' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateBannerDto.prototype, "isActive", void 0);
class UpdateBannerDto {
}
exports.UpdateBannerDto = UpdateBannerDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://cdn.example.com/banner-updated.png' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBannerDto.prototype, "imageUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '/category/electronics' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBannerDto.prototype, "redirectUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-02-28T23:59:59Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateBannerDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateBannerDto.prototype, "slotIndex", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 150 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateBannerDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateBannerDto.prototype, "isActive", void 0);
class PurchaseBannerDto {
}
exports.PurchaseBannerDto = PurchaseBannerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'HOME', enum: ['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART'] }),
    (0, class_validator_1.IsEnum)(['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART']),
    __metadata("design:type", String)
], PurchaseBannerDto.prototype, "slotType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CAROUSEL' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchaseBannerDto.prototype, "slotKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PurchaseBannerDto.prototype, "slotIndex", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 7, description: 'Duration in days' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PurchaseBannerDto.prototype, "durationDays", void 0);
class UploadBannerCreativeDto {
}
exports.UploadBannerCreativeDto = UploadBannerCreativeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'banner_purchase_123', description: 'Banner purchase ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadBannerCreativeDto.prototype, "bannerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://cdn.example.com/vendor-banner.png' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadBannerCreativeDto.prototype, "imageUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '/vendor/store/123' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadBannerCreativeDto.prototype, "redirectUrl", void 0);
class TrackBannerDto {
}
exports.TrackBannerDto = TrackBannerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CLICK', enum: ['IMPRESSION', 'CLICK'], description: 'Event type' }),
    (0, class_validator_1.IsEnum)(['IMPRESSION', 'CLICK']),
    __metadata("design:type", String)
], TrackBannerDto.prototype, "event", void 0);
class BannerResponseDto {
}
exports.BannerResponseDto = BannerResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'banner_123' }),
    __metadata("design:type", String)
], BannerResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'vendor_123' }),
    __metadata("design:type", String)
], BannerResponseDto.prototype, "vendorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://cdn.example.com/banner.png' }),
    __metadata("design:type", String)
], BannerResponseDto.prototype, "imageUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '/category/mobiles' }),
    __metadata("design:type", String)
], BannerResponseDto.prototype, "redirectUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'HOME' }),
    __metadata("design:type", String)
], BannerResponseDto.prototype, "slotType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], BannerResponseDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], BannerResponseDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], BannerResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: BannerMetadataDto }),
    __metadata("design:type", BannerMetadataDto)
], BannerResponseDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], BannerResponseDto.prototype, "createdAt", void 0);
class GetActiveBannersQueryDto {
}
exports.GetActiveBannersQueryDto = GetActiveBannersQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'HOME', description: 'Page identifier' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetActiveBannersQueryDto.prototype, "slotType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'CAROUSEL', description: 'Exact placement key' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetActiveBannersQueryDto.prototype, "slotKey", void 0);
//# sourceMappingURL=banner.dto.js.map