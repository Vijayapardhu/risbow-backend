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
exports.VendorStoreController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const vendor_store_service_1 = require("./vendor-store.service");
const upload_service_1 = require("../upload/upload.service");
const store_settings_dto_1 = require("./dto/store-settings.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let VendorStoreController = class VendorStoreController {
    constructor(storeService, uploadService) {
        this.storeService = storeService;
        this.uploadService = uploadService;
    }
    async getProfile(req) {
        return this.storeService.getProfile(req.user.id);
    }
    async updateProfile(req, dto) {
        return this.storeService.updateProfile(req.user.id, dto);
    }
    async updateTimings(req, dto) {
        return this.storeService.updateTimings(req.user.id, dto);
    }
    async updatePickupSettings(req, dto) {
        return this.storeService.updatePickupSettings(req.user.id, dto);
    }
    async getPublicProfile(vendorCode) {
        return this.storeService.getPublicProfile(vendorCode);
    }
    async uploadLogo(req, file) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        const { url } = await this.uploadService.uploadImage(file, 'vendors', req.user.id);
        return this.storeService.updateProfile(req.user.id, { storeLogo: url });
    }
    async uploadBanner(req, file) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        const { url } = await this.uploadService.uploadImage(file, 'vendors', req.user.id);
        return this.storeService.updateProfile(req.user.id, { storeBanner: url });
    }
};
exports.VendorStoreController = VendorStoreController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my store profile' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VendorStoreController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update store profile (name, logo, banner)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, store_settings_dto_1.UpdateStoreProfileDto]),
    __metadata("design:returntype", Promise)
], VendorStoreController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)('timings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update store opening hours' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, store_settings_dto_1.UpdateStoreTimingsDto]),
    __metadata("design:returntype", Promise)
], VendorStoreController.prototype, "updateTimings", null);
__decorate([
    (0, common_1.Put)('pickup-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Configure in-store pickup settings' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, store_settings_dto_1.UpdatePickupSettingsDto]),
    __metadata("design:returntype", Promise)
], VendorStoreController.prototype, "updatePickupSettings", null);
__decorate([
    (0, common_1.Get)('public/:vendorCode'),
    (0, swagger_1.ApiOperation)({ summary: 'Get public store profile by vendor code' }),
    __param(0, (0, common_1.Param)('vendorCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VendorStoreController.prototype, "getPublicProfile", null);
__decorate([
    (0, common_1.Post)('logo'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Upload store logo' }),
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
], VendorStoreController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.Post)('banner'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Upload store banner' }),
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
], VendorStoreController.prototype, "uploadBanner", null);
exports.VendorStoreController = VendorStoreController = __decorate([
    (0, swagger_1.ApiTags)('Vendor Store'),
    (0, common_1.Controller)('api/v1/vendor-store'),
    __metadata("design:paramtypes", [vendor_store_service_1.VendorStoreService,
        upload_service_1.UploadService])
], VendorStoreController);
//# sourceMappingURL=vendor-store.controller.js.map