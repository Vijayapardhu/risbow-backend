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
exports.VariationDto = exports.VariationAttributesDto = exports.VariationStatus = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var VariationStatus;
(function (VariationStatus) {
    VariationStatus["ACTIVE"] = "ACTIVE";
    VariationStatus["OUT_OF_STOCK"] = "OUT_OF_STOCK";
})(VariationStatus || (exports.VariationStatus = VariationStatus = {}));
class VariationAttributesDto {
}
exports.VariationAttributesDto = VariationAttributesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VariationAttributesDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VariationAttributesDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VariationAttributesDto.prototype, "material", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VariationAttributesDto.prototype, "style", void 0);
class VariationDto {
}
exports.VariationDto = VariationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID is generated on creation' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VariationDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: VariationAttributesDto }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => VariationAttributesDto),
    __metadata("design:type", VariationAttributesDto)
], VariationDto.prototype, "attributes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], VariationDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], VariationDto.prototype, "offerPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], VariationDto.prototype, "stock", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: VariationStatus }),
    (0, class_validator_1.IsEnum)(VariationStatus),
    __metadata("design:type", String)
], VariationDto.prototype, "status", void 0);
//# sourceMappingURL=variation.dto.js.map