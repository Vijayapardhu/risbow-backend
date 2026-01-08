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
exports.GiftsController = exports.CatalogController = void 0;
const common_1 = require("@nestjs/common");
const catalog_service_1 = require("./catalog.service");
const catalog_dto_1 = require("./dto/catalog.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
let CatalogController = class CatalogController {
    constructor(catalogService) {
        this.catalogService = catalogService;
    }
    async findAll(filters) {
        return this.catalogService.findAll(filters);
    }
    async create(createProductDto) {
        return this.catalogService.createProduct(createProductDto);
    }
    async bulkUpload(file) {
        if (!file)
            throw new Error('File not present');
        const content = file.buffer.toString('utf-8');
        return this.catalogService.processBulkUpload(content);
    }
};
exports.CatalogController = CatalogController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [catalog_dto_1.ProductFilterDto]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [catalog_dto_1.CreateProductDto]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "bulkUpload", null);
exports.CatalogController = CatalogController = __decorate([
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService])
], CatalogController);
let GiftsController = class GiftsController {
    constructor(catalogService) {
        this.catalogService = catalogService;
    }
    async getEligible(cartValue) {
        const val = parseInt(cartValue, 10) || 0;
        return this.catalogService.getEligibleGifts(val);
    }
};
exports.GiftsController = GiftsController;
__decorate([
    (0, common_1.Get)('eligible'),
    __param(0, (0, common_1.Query)('cartValue')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "getEligible", null);
exports.GiftsController = GiftsController = __decorate([
    (0, common_1.Controller)('gifts'),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService])
], GiftsController);
//# sourceMappingURL=catalog.controller.js.map