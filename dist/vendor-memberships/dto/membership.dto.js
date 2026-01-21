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
exports.CurrentMembershipResponseDto = exports.MembershipTierResponseDto = exports.UpgradeMembershipDto = exports.SubscribeMembershipDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class SubscribeMembershipDto {
}
exports.SubscribeMembershipDto = SubscribeMembershipDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.MembershipTier,
        description: 'Membership tier to subscribe to',
        example: 'BASIC',
    }),
    (0, class_validator_1.IsEnum)(client_1.MembershipTier),
    __metadata("design:type", String)
], SubscribeMembershipDto.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment method: COINS or MONEY',
        example: 'MONEY',
        enum: ['COINS', 'MONEY'],
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubscribeMembershipDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Auto-renew subscription',
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SubscribeMembershipDto.prototype, "autoRenew", void 0);
class UpgradeMembershipDto {
}
exports.UpgradeMembershipDto = UpgradeMembershipDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.MembershipTier,
        description: 'New membership tier',
        example: 'PRO',
    }),
    (0, class_validator_1.IsEnum)(client_1.MembershipTier),
    __metadata("design:type", String)
], UpgradeMembershipDto.prototype, "newTier", void 0);
class MembershipTierResponseDto {
}
exports.MembershipTierResponseDto = MembershipTierResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'FREE' }),
    __metadata("design:type", String)
], MembershipTierResponseDto.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0, description: 'Monthly price in rupees' }),
    __metadata("design:type", Number)
], MembershipTierResponseDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: 'Maximum SKUs allowed' }),
    __metadata("design:type", Number)
], MembershipTierResponseDto.prototype, "skuLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3, description: 'Maximum images per SKU' }),
    __metadata("design:type", Number)
], MembershipTierResponseDto.prototype, "imageLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.15, description: 'Commission rate (0.15 = 15%)' }),
    __metadata("design:type", Number)
], MembershipTierResponseDto.prototype, "commissionRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'MONTHLY', enum: client_1.PayoutCycle }),
    __metadata("design:type", String)
], MembershipTierResponseDto.prototype, "payoutCycle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: {
            prioritySupport: false,
            analytics: false,
            bulkUpload: false,
            promotions: false,
        },
        description: 'Tier features',
    }),
    __metadata("design:type", Object)
], MembershipTierResponseDto.prototype, "features", void 0);
class CurrentMembershipResponseDto {
}
exports.CurrentMembershipResponseDto = CurrentMembershipResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cm1234567890' }),
    __metadata("design:type", String)
], CurrentMembershipResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'BASIC', enum: client_1.MembershipTier }),
    __metadata("design:type", String)
], CurrentMembershipResponseDto.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 999, description: 'Monthly price in rupees' }),
    __metadata("design:type", Number)
], CurrentMembershipResponseDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100 }),
    __metadata("design:type", Number)
], CurrentMembershipResponseDto.prototype, "skuLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5 }),
    __metadata("design:type", Number)
], CurrentMembershipResponseDto.prototype, "imageLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.12 }),
    __metadata("design:type", Number)
], CurrentMembershipResponseDto.prototype, "commissionRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'WEEKLY', enum: client_1.PayoutCycle }),
    __metadata("design:type", String)
], CurrentMembershipResponseDto.prototype, "payoutCycle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], CurrentMembershipResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], CurrentMembershipResponseDto.prototype, "autoRenew", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T00:00:00.000Z' }),
    __metadata("design:type", Date)
], CurrentMembershipResponseDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-02-15T00:00:00.000Z', nullable: true }),
    __metadata("design:type", Date)
], CurrentMembershipResponseDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: {
            currentSkus: 45,
            remainingSkus: 55,
            usagePercentage: 45,
        },
        description: 'Usage statistics',
    }),
    __metadata("design:type", Object)
], CurrentMembershipResponseDto.prototype, "usage", void 0);
//# sourceMappingURL=membership.dto.js.map