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
exports.GiftsController = exports.CategoriesController = exports.CatalogController = void 0;
const common_1 = require("@nestjs/common");
const catalog_service_1 = require("./catalog.service");
const catalog_dto_1 = require("./dto/catalog.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const platform_express_1 = require("@nestjs/platform-express");
let CatalogController = class CatalogController {
    constructor(catalogService) {
        this.catalogService = catalogService;
    }
    async findAll(filters) {
        return this.catalogService.findAll(filters);
    }
    async findOne(id) {
        return this.catalogService.findOne(id);
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
    async update(id, body) {
        return this.catalogService.updateProduct(id, body);
    }
    async remove(id) {
        return this.catalogService.deleteProduct(id);
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
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [catalog_dto_1.CreateProductDto]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "bulkUpload", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, catalog_dto_1.UpdateProductDto]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "remove", null);
exports.CatalogController = CatalogController = __decorate([
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService])
], CatalogController);
let CategoriesController = class CategoriesController {
    constructor(catalogService) {
        this.catalogService = catalogService;
    }
    async getAll(includeInactive) {
        return this.catalogService.getCategories(includeInactive === 'true');
    }
    async findOne(id) {
        return this.catalogService.getCategory(id);
    }
    async getRules(id) {
        return this.catalogService.getCategoryRules(id);
    }
    async create(body) {
        return this.catalogService.createCategory(body);
    }
    async update(id, body) {
        return this.catalogService.updateCategory(id, body);
    }
    async remove(id) {
        return this.catalogService.deleteCategory(id);
    }
    async getCategorySpecs(id, includeInactive) {
        return this.catalogService.getCategorySpecs(id, includeInactive === 'true');
    }
    async createCategorySpec(id, body) {
        return this.catalogService.createCategorySpec(id, body);
    }
    async updateCategorySpec(specId, body) {
        return this.catalogService.updateCategorySpec(specId, body);
    }
    async deleteCategorySpec(specId) {
        return this.catalogService.deleteCategorySpec(specId);
    }
    async reorderSpecs(id, body) {
        return this.catalogService.reorderSpecs(id, body.specs);
    }
};
exports.CategoriesController = CategoriesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('includeInactive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/rules'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "getRules", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/specs'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('includeInactive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "getCategorySpecs", null);
__decorate([
    (0, common_1.Post)(':id/specs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "createCategorySpec", null);
__decorate([
    (0, common_1.Patch)('specs/:specId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('specId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "updateCategorySpec", null);
__decorate([
    (0, common_1.Delete)('specs/:specId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('specId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "deleteCategorySpec", null);
__decorate([
    (0, common_1.Put)(':id/specs/reorder'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "reorderSpecs", null);
exports.CategoriesController = CategoriesController = __decorate([
    (0, common_1.Controller)('categories'),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService])
], CategoriesController);
let GiftsController = class GiftsController {
    constructor(catalogService) {
        this.catalogService = catalogService;
    }
    async getAll() {
        return this.catalogService.getAllGifts();
    }
    async getEligible(cartValue, categoryIds) {
        const val = parseInt(cartValue, 10) || 0;
        const cats = categoryIds ? categoryIds.split(',') : [];
        return this.catalogService.getEligibleGifts(val, cats);
    }
    async create(body) {
        return this.catalogService.createGift(body);
    }
    async update(id, body) {
        return this.catalogService.updateGift(id, body);
    }
    async remove(id) {
        return this.catalogService.deleteGift(id);
    }
};
exports.GiftsController = GiftsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('eligible'),
    __param(0, (0, common_1.Query)('cartValue')),
    __param(1, (0, common_1.Query)('categoryIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "getEligible", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "remove", null);
exports.GiftsController = GiftsController = __decorate([
    (0, common_1.Controller)('gifts'),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService])
], GiftsController);
//# sourceMappingURL=catalog.controller.js.map