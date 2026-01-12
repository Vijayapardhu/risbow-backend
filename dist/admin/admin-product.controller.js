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
exports.AdminProductController = void 0;
const common_1 = require("@nestjs/common");
const admin_product_service_1 = require("./admin-product.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let AdminProductController = class AdminProductController {
    constructor(productService) {
        this.productService = productService;
    }
    async getProductList(search, period, page = 1, limit = 50) {
        return this.productService.getProductList({ search, period, page, limit });
    }
    async getProductDetail(id) {
        return this.productService.getProductDetail(id);
    }
    async createProduct(productData) {
        return this.productService.createProduct(productData);
    }
    async updateProduct(id, productData) {
        return this.productService.updateProduct(id, productData);
    }
    async deleteProduct(id) {
        return this.productService.deleteProduct(id);
    }
    async getVendorOffers(id) {
        return this.productService.getVendorOffers(id);
    }
    async getProductAnalytics(id, period) {
        return this.productService.getProductAnalytics(id, period);
    }
};
exports.AdminProductController = AdminProductController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('period')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "getProductList", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "getProductDetail", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)(':id/vendor-offers'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "getVendorOffers", null);
__decorate([
    (0, common_1.Get)(':id/analytics'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "getProductAnalytics", null);
exports.AdminProductController = AdminProductController = __decorate([
    (0, common_1.Controller)('admin/products'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __metadata("design:paramtypes", [admin_product_service_1.AdminProductService])
], AdminProductController);
//# sourceMappingURL=admin-product.controller.js.map