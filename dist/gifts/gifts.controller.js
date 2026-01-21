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
exports.GiftsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const gifts_service_1 = require("./gifts.service");
const gift_dto_1 = require("./dto/gift.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
let GiftsController = class GiftsController {
    constructor(giftsService) {
        this.giftsService = giftsService;
    }
    async getEligibleGifts(categories) {
        const categoryIds = categories ? categories.split(',').filter(Boolean) : [];
        return this.giftsService.getEligibleGifts(categoryIds);
    }
    async getAllGifts() {
        return this.giftsService.getAllGifts();
    }
    async getInventoryReport() {
        return this.giftsService.getInventoryReport();
    }
    async getGiftById(id) {
        return this.giftsService.getGiftById(id);
    }
    async createGift(dto) {
        return this.giftsService.createGift(dto);
    }
    async updateGift(id, dto) {
        return this.giftsService.updateGift(id, dto);
    }
    async deleteGift(id) {
        await this.giftsService.deleteGift(id);
    }
};
exports.GiftsController = GiftsController;
__decorate([
    (0, common_1.Get)('gifts/eligible'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get eligible gifts for current cart',
        description: 'Returns gifts that are eligible based on cart categories and have stock available',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'categories',
        required: false,
        description: 'Comma-separated category IDs from cart',
        example: 'cat_electronics,cat_mobiles',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of eligible gifts',
        type: [gift_dto_1.GiftResponseDto],
    }),
    __param(0, (0, common_1.Query)('categories')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "getEligibleGifts", null);
__decorate([
    (0, common_1.Get)('admin/gifts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all gift SKUs (Admin)',
        description: 'Returns all gift SKUs in the system',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of all gifts',
        type: [gift_dto_1.GiftResponseDto],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "getAllGifts", null);
__decorate([
    (0, common_1.Get)('admin/gifts/inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get gift inventory report (Admin)',
        description: 'Returns inventory overview with stock levels and alerts',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Inventory report',
        schema: {
            example: {
                totalGifts: 10,
                outOfStock: 2,
                lowStock: 3,
                gifts: [],
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "getInventoryReport", null);
__decorate([
    (0, common_1.Get)('admin/gifts/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get gift by ID (Admin)',
        description: 'Returns a specific gift SKU',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Gift details',
        type: gift_dto_1.GiftResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Gift not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "getGiftById", null);
__decorate([
    (0, common_1.Post)('admin/gifts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create new gift SKU (Admin)',
        description: 'Creates a new gift SKU with stock and eligibility rules',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Gift created successfully',
        type: gift_dto_1.GiftResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [gift_dto_1.CreateGiftDto]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "createGift", null);
__decorate([
    (0, common_1.Patch)('admin/gifts/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Update gift SKU (Admin)',
        description: 'Updates an existing gift SKU',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Gift updated successfully',
        type: gift_dto_1.GiftResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Gift not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, gift_dto_1.UpdateGiftDto]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "updateGift", null);
__decorate([
    (0, common_1.Delete)('admin/gifts/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete gift SKU (Admin)',
        description: 'Deletes a gift SKU from the system',
    }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Gift deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Gift not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftsController.prototype, "deleteGift", null);
exports.GiftsController = GiftsController = __decorate([
    (0, swagger_1.ApiTags)('Gifts'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [gifts_service_1.GiftsService])
], GiftsController);
//# sourceMappingURL=gifts.controller.js.map