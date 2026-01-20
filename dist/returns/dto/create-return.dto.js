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
exports.CreateReturnDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var ReturnReason;
(function (ReturnReason) {
    ReturnReason["DAMAGED_PRODUCT"] = "DAMAGED_PRODUCT";
    ReturnReason["WRONG_ITEM"] = "WRONG_ITEM";
    ReturnReason["MISSING_PARTS"] = "MISSING_PARTS";
    ReturnReason["QUALITY_ISSUE"] = "QUALITY_ISSUE";
    ReturnReason["SIZE_FIT_ISSUE"] = "SIZE_FIT_ISSUE";
    ReturnReason["OTHER"] = "OTHER";
})(ReturnReason || (ReturnReason = {}));
class ReturnItemDto {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReturnItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ReturnItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReturnItemDto.prototype, "condition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ReturnReason }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ReturnReason),
    __metadata("design:type", String)
], ReturnItemDto.prototype, "reason", void 0);
class CreateReturnDto {
}
exports.CreateReturnDto = CreateReturnDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateReturnDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ReturnReason }),
    (0, class_validator_1.IsEnum)(ReturnReason),
    __metadata("design:type", String)
], CreateReturnDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReturnDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateReturnDto.prototype, "evidenceImages", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReturnDto.prototype, "evidenceVideo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ReturnItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ReturnItemDto),
    __metadata("design:type", Array)
], CreateReturnDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateReturnDto.prototype, "pickupAddress", void 0);
//# sourceMappingURL=create-return.dto.js.map