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
exports.UpdatePickupSettingsDto = exports.UpdateStoreTimingsDto = exports.UpdateStoreProfileDto = exports.DayTimingDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class DayTimingDto {
}
exports.DayTimingDto = DayTimingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'MONDAY' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DayTimingDto.prototype, "day", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '09:00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:MM format' }),
    __metadata("design:type", String)
], DayTimingDto.prototype, "open", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '21:00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:MM format' }),
    __metadata("design:type", String)
], DayTimingDto.prototype, "close", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DayTimingDto.prototype, "isOpen", void 0);
class UpdateStoreProfileDto {
}
exports.UpdateStoreProfileDto = UpdateStoreProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'My Awesome Store' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStoreProfileDto.prototype, "storeName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://example.com/logo.jpg' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStoreProfileDto.prototype, "storeLogo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://example.com/banner.jpg' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStoreProfileDto.prototype, "storeBanner", void 0);
class UpdateStoreTimingsDto {
}
exports.UpdateStoreTimingsDto = UpdateStoreTimingsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [DayTimingDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DayTimingDto),
    __metadata("design:type", Array)
], UpdateStoreTimingsDto.prototype, "timings", void 0);
class UpdatePickupSettingsDto {
}
exports.UpdatePickupSettingsDto = UpdatePickupSettingsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePickupSettingsDto.prototype, "pickupEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [DayTimingDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DayTimingDto),
    __metadata("design:type", Array)
], UpdatePickupSettingsDto.prototype, "pickupTimings", void 0);
//# sourceMappingURL=store-settings.dto.js.map