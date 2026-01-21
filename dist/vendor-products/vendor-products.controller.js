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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorProductsController = void 0;
const common_1 = require("@nestjs/common");
const product_dto_1 = require("./dto/product.dto");
const product_specs_dto_1 = require("./dto/product-specs.dto");
const variation_dto_1 = require("./dto/variation.dto");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const vendor_products_service_1 = require("./vendor-products.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let VendorProductsController = class VendorProductsController {
    constructor(productsService) {
        this.productsService = productsService;
    }
    async bulkUpload(req, file) {
        if (!file)
            throw new common_1.BadRequestException('No CSV file uploaded');
        if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
            throw new common_1.BadRequestException('File must be a CSV');
        }
        return this.productsService.processBulkUpload(req.user.id, file.buffer);
    }
    async getTemplate(res) {
        const csv = `Title,Description,Price,OfferPrice,Stock,SKU,CategoryId,BrandName\nExample Product,This is a description,1000,900,50,SKU-12345,cat_123,BrandX`;
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=products_template.csv');
        res.send(csv);
    }
    async create(req, dto) {
        return this.productsService.createProduct(req.user.id, dto);
    }
    async findAll(req) {
        return this.productsService.findAllProducts(req.user.id);
    }
    async update(req, id, dto) {
        return this.productsService.updateProduct(req.user.id, id, dto);
    }
    async updateStatus(req, id, dto) {
        return this.productsService.updateProductStatus(req.user.id, id, dto.isActive);
    }
    async saveSpecs(req, id, dto) {
        return this.productsService.saveProductSpecs(req.user.id, id, dto);
    }
    async updateSpecs(req, id, dto) {
        return this.productsService.saveProductSpecs(req.user.id, id, dto);
    }
    async addVariation(req, id, dto) {
        return this.productsService.addVariation(req.user.id, id, dto);
    }
    async updateVariation(req, id, dto) {
        return this.productsService.updateVariation(req.user.id, id, dto);
    }
    async deleteVariation(req, id, variationId) {
        return this.productsService.deleteVariation(req.user.id, id, variationId);
    }
};
exports.VendorProductsController = VendorProductsController;
__decorate([
    (0, common_1.Post)('bulk-upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk upload products via CSV' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "bulkUpload", null);
__decorate([
    (0, common_1.Get)('template'),
    (0, swagger_1.ApiOperation)({ summary: 'Download CSV template for bulk upload' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new product' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, product_dto_1.CreateProductDto]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all products for vendor' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a product' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update product status' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, product_dto_1.ProductStatusDto]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/specs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add or update product specifications' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, product_specs_dto_1.SaveProductSpecsDto]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "saveSpecs", null);
__decorate([
    (0, common_1.Put)(':id/specs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update product specifications' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, product_specs_dto_1.SaveProductSpecsDto]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "updateSpecs", null);
__decorate([
    (0, common_1.Post)(':id/variations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add a product variation' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, variation_dto_1.VariationDto]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "addVariation", null);
__decorate([
    (0, common_1.Put)(':id/variations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a product variation' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, variation_dto_1.VariationDto]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "updateVariation", null);
__decorate([
    (0, common_1.Delete)(':id/variations/:variationId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a product variation' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('variationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], VendorProductsController.prototype, "deleteVariation", null);
exports.VendorProductsController = VendorProductsController = __decorate([
    (0, swagger_1.ApiTags)('Vendor Products'),
    (0, common_1.Controller)('api/v1/vendor-products'),
    __metadata("design:paramtypes", [vendor_products_service_1.VendorProductsService])
], VendorProductsController);
//# sourceMappingURL=vendor-products.controller.js.map