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
exports.VendorMembershipsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const vendor_memberships_service_1 = require("./vendor-memberships.service");
const membership_dto_1 = require("./dto/membership.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let VendorMembershipsController = class VendorMembershipsController {
    constructor(membershipService) {
        this.membershipService = membershipService;
    }
    async getAllTiers() {
        return this.membershipService.getAllTiers();
    }
    async subscribe(req, dto) {
        const vendorId = req.user.id;
        return this.membershipService.subscribe(vendorId, dto);
    }
    async upgrade(req, dto) {
        const vendorId = req.user.id;
        return this.membershipService.upgrade(vendorId, dto);
    }
    async getCurrentMembership(req) {
        const vendorId = req.user.id;
        return this.membershipService.getCurrentMembership(vendorId);
    }
    async cancelAutoRenewal(req) {
        const vendorId = req.user.id;
        return this.membershipService.cancelAutoRenewal(vendorId);
    }
    async cancel(req) {
        const vendorId = req.user.id;
        return this.membershipService.cancelAutoRenewal(vendorId);
    }
};
exports.VendorMembershipsController = VendorMembershipsController;
__decorate([
    (0, common_1.Get)('tiers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all membership tiers' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of all available membership tiers',
        type: [membership_dto_1.MembershipTierResponseDto],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VendorMembershipsController.prototype, "getAllTiers", null);
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, swagger_1.ApiOperation)({ summary: 'Subscribe to a membership tier' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Subscription successful',
        type: membership_dto_1.CurrentMembershipResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - already subscribed or insufficient balance' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, membership_dto_1.SubscribeMembershipDto]),
    __metadata("design:returntype", Promise)
], VendorMembershipsController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Post)('upgrade'),
    (0, swagger_1.ApiOperation)({ summary: 'Upgrade to a higher tier' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Upgrade successful',
        type: membership_dto_1.CurrentMembershipResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - cannot downgrade or no active membership' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, membership_dto_1.UpgradeMembershipDto]),
    __metadata("design:returntype", Promise)
], VendorMembershipsController.prototype, "upgrade", null);
__decorate([
    (0, common_1.Get)('current'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current membership details' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Current membership details with usage statistics',
        type: membership_dto_1.CurrentMembershipResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'No active membership found' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VendorMembershipsController.prototype, "getCurrentMembership", null);
__decorate([
    (0, common_1.Post)('cancel-auto-renewal'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel auto-renewal' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Auto-renewal cancelled',
        schema: {
            properties: {
                message: { type: 'string', example: 'Auto-renewal cancelled successfully' },
                endDate: { type: 'string', format: 'date-time' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'No active membership found' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VendorMembershipsController.prototype, "cancelAutoRenewal", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel membership auto-renewal (Alias)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Auto-renewal cancelled',
        schema: {
            properties: {
                message: { type: 'string', example: 'Auto-renewal cancelled successfully' },
                endDate: { type: 'string', format: 'date-time' },
            },
        },
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VendorMembershipsController.prototype, "cancel", null);
exports.VendorMembershipsController = VendorMembershipsController = __decorate([
    (0, swagger_1.ApiTags)('Vendor Memberships'),
    (0, common_1.Controller)('api/v1/vendor-memberships'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [vendor_memberships_service_1.VendorMembershipsService])
], VendorMembershipsController);
//# sourceMappingURL=vendor-memberships.controller.js.map