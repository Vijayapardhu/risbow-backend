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
exports.CouponsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const coupons_service_1 = require("./coupons.service");
const coupon_dto_1 = require("./dto/coupon.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
let CouponsController = class CouponsController {
    constructor(couponsService) {
        this.couponsService = couponsService;
    }
    async validateCoupon(dto) {
        return this.couponsService.validateCoupon(dto);
    }
    async getActiveCoupons() {
        return this.couponsService.getActiveCoupons();
    }
    async getAllCoupons() {
        return this.couponsService.getAllCoupons();
    }
    async getCouponById(id) {
        const coupon = await this.couponsService['prisma'].coupon.findUnique({
            where: { id },
        });
        if (!coupon) {
            throw new Error('Coupon not found');
        }
        return this.couponsService['mapToResponseDto'](coupon);
    }
    async createCoupon(dto) {
        return this.couponsService.createCoupon(dto);
    }
    async updateCoupon(id, dto) {
        return this.couponsService.updateCoupon(id, dto);
    }
    async deleteCoupon(id) {
        await this.couponsService.deleteCoupon(id);
    }
};
exports.CouponsController = CouponsController;
__decorate([
    (0, common_1.Post)('coupons/validate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Validate coupon without applying',
        description: 'Validates a coupon code and returns discount details without applying it',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Validation result',
        type: coupon_dto_1.CouponValidationResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [coupon_dto_1.ValidateCouponDto]),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "validateCoupon", null);
__decorate([
    (0, common_1.Get)('users/me/coupons'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get available coupons for user',
        description: 'Returns active coupons that are currently valid and available',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of available coupons',
        type: [coupon_dto_1.CouponResponseDto],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "getActiveCoupons", null);
__decorate([
    (0, common_1.Get)('admin/coupons'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all coupons (Admin)',
        description: 'Returns all coupons in the system',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of all coupons',
        type: [coupon_dto_1.CouponResponseDto],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "getAllCoupons", null);
__decorate([
    (0, common_1.Get)('admin/coupons/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get coupon by ID (Admin)',
        description: 'Returns a specific coupon',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Coupon details',
        type: coupon_dto_1.CouponResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Coupon not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "getCouponById", null);
__decorate([
    (0, common_1.Post)('admin/coupons'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create new coupon (Admin)',
        description: 'Creates a new coupon with specified rules and limits',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Coupon created successfully',
        type: coupon_dto_1.CouponResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Coupon code already exists' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [coupon_dto_1.CreateCouponDto]),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "createCoupon", null);
__decorate([
    (0, common_1.Patch)('admin/coupons/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Update coupon (Admin)',
        description: 'Updates an existing coupon',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Coupon updated successfully',
        type: coupon_dto_1.CouponResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Coupon not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, coupon_dto_1.UpdateCouponDto]),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "updateCoupon", null);
__decorate([
    (0, common_1.Delete)('admin/coupons/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete coupon (Admin)',
        description: 'Deletes a coupon from the system',
    }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Coupon deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Coupon not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CouponsController.prototype, "deleteCoupon", null);
exports.CouponsController = CouponsController = __decorate([
    (0, swagger_1.ApiTags)('Coupons'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [coupons_service_1.CouponsService])
], CouponsController);
//# sourceMappingURL=coupons.controller.js.map