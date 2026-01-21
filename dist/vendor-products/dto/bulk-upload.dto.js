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
exports.BulkUploadProductDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class BulkUploadProductDto {
}
exports.BulkUploadProductDto = BulkUploadProductDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Title is required' }),
    __metadata("design:type", String)
], BulkUploadProductDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkUploadProductDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Price is required' }),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    __metadata("design:type", Number)
], BulkUploadProductDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    __metadata("design:type", Number)
], BulkUploadProductDto.prototype, "offerPrice", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Category ID is required' }),
    __metadata("design:type", String)
], BulkUploadProductDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'SKU is required' }),
    __metadata("design:type", String)
], BulkUploadProductDto.prototype, "sku", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Stock is required' }),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    __metadata("design:type", Number)
], BulkUploadProductDto.prototype, "stock", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkUploadProductDto.prototype, "brandName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkUploadProductDto.prototype, "storeName", void 0);
//# sourceMappingURL=bulk-upload.dto.js.map