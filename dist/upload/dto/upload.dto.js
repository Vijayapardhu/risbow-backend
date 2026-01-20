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
exports.DocumentUploadDto = exports.MultipleImageUploadDto = exports.SingleImageUploadDto = exports.DocumentType = exports.UploadContext = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var UploadContext;
(function (UploadContext) {
    UploadContext["PRODUCT"] = "products";
    UploadContext["VENDOR"] = "vendors";
    UploadContext["BANNER"] = "banners";
})(UploadContext || (exports.UploadContext = UploadContext = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["KYC"] = "KYC";
    DocumentType["RETURN_PROOF"] = "RETURN_PROOF";
    DocumentType["OTHER"] = "OTHER";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
class SingleImageUploadDto {
}
exports.SingleImageUploadDto = SingleImageUploadDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: UploadContext, example: UploadContext.PRODUCT }),
    (0, class_validator_1.IsEnum)(UploadContext),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SingleImageUploadDto.prototype, "context", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-of-entity', description: 'ID of the product/vendor/banner' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SingleImageUploadDto.prototype, "contextId", void 0);
class MultipleImageUploadDto {
}
exports.MultipleImageUploadDto = MultipleImageUploadDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: UploadContext, example: UploadContext.PRODUCT }),
    (0, class_validator_1.IsEnum)(UploadContext),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], MultipleImageUploadDto.prototype, "context", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-of-entity' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], MultipleImageUploadDto.prototype, "contextId", void 0);
class DocumentUploadDto {
}
exports.DocumentUploadDto = DocumentUploadDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: DocumentType, example: DocumentType.KYC }),
    (0, class_validator_1.IsEnum)(DocumentType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DocumentUploadDto.prototype, "documentType", void 0);
//# sourceMappingURL=upload.dto.js.map