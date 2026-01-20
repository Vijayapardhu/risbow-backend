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
exports.ProcessRefundDto = exports.CreateRefundRequestDto = exports.RefundMethod = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var RefundMethod;
(function (RefundMethod) {
    RefundMethod["ORIGINAL_PAYMENT"] = "ORIGINAL_PAYMENT";
    RefundMethod["COINS"] = "COINS";
    RefundMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
})(RefundMethod || (exports.RefundMethod = RefundMethod = {}));
class CreateRefundRequestDto {
}
exports.CreateRefundRequestDto = CreateRefundRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Order ID to refund' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRefundRequestDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reason for refund' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRefundRequestDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Amount to refund (in paise). If empty, defaults to full order total.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateRefundRequestDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: RefundMethod, default: RefundMethod.ORIGINAL_PAYMENT }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RefundMethod),
    __metadata("design:type", String)
], CreateRefundRequestDto.prototype, "refundMethod", void 0);
class ProcessRefundDto {
}
exports.ProcessRefundDto = ProcessRefundDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Admin notes' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProcessRefundDto.prototype, "adminNotes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Approved Refund Amount (in paise)' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ProcessRefundDto.prototype, "approvedAmount", void 0);
//# sourceMappingURL=refund.dto.js.map