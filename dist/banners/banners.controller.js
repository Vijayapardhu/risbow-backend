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
exports.BannersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const banners_service_1 = require("./banners.service");
const banner_dto_1 = require("./dto/banner.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
let BannersController = class BannersController {
    constructor(bannersService) {
        this.bannersService = bannersService;
    }
    async getActiveBanners(slotType, slotKey) {
        return this.bannersService.getActiveBanners(slotType, slotKey);
    }
    async trackBannerEvent(id, dto) {
        await this.bannersService.trackBannerEvent(id, dto.event);
        return { message: 'Event tracked successfully' };
    }
    async getAllBanners() {
        return this.bannersService.getAllBanners();
    }
    async getBannerById(id) {
        return this.bannersService.getBannerById(id);
    }
    async createBanner(dto) {
        return this.bannersService.createBanner(dto);
    }
    async updateBanner(id, dto) {
        return this.bannersService.updateBanner(id, dto);
    }
    async deleteBanner(id) {
        await this.bannersService.deleteBanner(id);
    }
    async approveBanner(id) {
        return this.bannersService.approveBanner(id);
    }
    async getBannerAnalytics(id) {
        return this.bannersService.getBannerAnalytics(id);
    }
    async purchaseBannerSlot(req, dto) {
        const vendorId = req.user.id;
        return this.bannersService.purchaseBannerSlot(vendorId, dto);
    }
    async uploadBannerCreative(req, dto) {
        const vendorId = req.user.id;
        return this.bannersService.uploadBannerCreative(vendorId, dto);
    }
    async getVendorBanners(req) {
        const vendorId = req.user.id;
        return this.bannersService.getVendorBanners(vendorId);
    }
};
exports.BannersController = BannersController;
__decorate([
    (0, common_1.Get)('banners/active'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get active banners by slot',
        description: 'Returns active banners for a given placement, sorted by priority and slotIndex',
    }),
    (0, swagger_1.ApiQuery)({ name: 'slotType', required: true, example: 'HOME' }),
    (0, swagger_1.ApiQuery)({ name: 'slotKey', required: false, example: 'CAROUSEL' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of active banners',
        type: [banner_dto_1.BannerResponseDto],
    }),
    __param(0, (0, common_1.Query)('slotType')),
    __param(1, (0, common_1.Query)('slotKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getActiveBanners", null);
__decorate([
    (0, common_1.Post)('banners/:id/track'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Track banner event',
        description: 'Track impression or click event for analytics',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Event tracked successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, banner_dto_1.TrackBannerDto]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "trackBannerEvent", null);
__decorate([
    (0, common_1.Get)('admin/banners'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all banners (Admin)',
        description: 'Returns all banners in the system',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of all banners',
        type: [banner_dto_1.BannerResponseDto],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getAllBanners", null);
__decorate([
    (0, common_1.Get)('admin/banners/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get banner by ID (Admin)',
        description: 'Returns a specific banner',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Banner details',
        type: banner_dto_1.BannerResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Banner not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getBannerById", null);
__decorate([
    (0, common_1.Post)('admin/banners'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create system banner (Admin)',
        description: 'Creates a new system banner with image upload',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Banner created successfully',
        type: banner_dto_1.BannerResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [banner_dto_1.CreateBannerDto]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "createBanner", null);
__decorate([
    (0, common_1.Patch)('admin/banners/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Update banner (Admin)',
        description: 'Updates an existing banner',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Banner updated successfully',
        type: banner_dto_1.BannerResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Banner not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, banner_dto_1.UpdateBannerDto]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "updateBanner", null);
__decorate([
    (0, common_1.Delete)('admin/banners/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete banner (Admin)',
        description: 'Deletes a banner from the system',
    }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Banner deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Banner not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "deleteBanner", null);
__decorate([
    (0, common_1.Post)('admin/banners/:id/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Approve vendor banner (Admin)',
        description: 'Approves a vendor banner and makes it active',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Banner approved successfully',
        type: banner_dto_1.BannerResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Banner not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "approveBanner", null);
__decorate([
    (0, common_1.Get)('admin/banners/:id/analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get banner analytics (Admin)',
        description: 'Returns analytics data for a specific banner',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Banner analytics',
        schema: {
            example: {
                bannerId: 'banner_123',
                slotType: 'HOME',
                slotKey: 'CAROUSEL',
                impressions: 1000,
                clicks: 50,
                ctr: 5.0,
            },
        },
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getBannerAnalytics", null);
__decorate([
    (0, common_1.Post)('vendor/banners/purchase'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.VENDOR),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Purchase banner slot (Vendor)',
        description: 'Vendor purchases a banner slot for specified duration',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Banner slot purchased successfully',
        type: banner_dto_1.BannerResponseDto,
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, banner_dto_1.PurchaseBannerDto]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "purchaseBannerSlot", null);
__decorate([
    (0, common_1.Post)('vendor/banners/upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.VENDOR),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload banner creative (Vendor)',
        description: 'Vendor uploads banner creative after purchasing slot',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Banner creative uploaded successfully',
        type: banner_dto_1.BannerResponseDto,
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, banner_dto_1.UploadBannerCreativeDto]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "uploadBannerCreative", null);
__decorate([
    (0, common_1.Get)('vendor/banners'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.VENDOR),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get vendor banners (Vendor)',
        description: 'Returns all banners owned by the vendor',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of vendor banners',
        type: [banner_dto_1.BannerResponseDto],
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BannersController.prototype, "getVendorBanners", null);
exports.BannersController = BannersController = __decorate([
    (0, swagger_1.ApiTags)('Banners'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [banners_service_1.BannersService])
], BannersController);
//# sourceMappingURL=banners.controller.js.map