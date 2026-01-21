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
exports.VendorOrdersController = void 0;
const common_1 = require("@nestjs/common");
const vendor_orders_service_1 = require("./vendor-orders.service");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
let VendorOrdersController = class VendorOrdersController {
    constructor(vendorOrdersService) {
        this.vendorOrdersService = vendorOrdersService;
    }
    async getOrders(req, page = 1, limit = 10, status) {
        return this.vendorOrdersService.getOrdersForVendor(req.user.vendorId, Number(page), Number(limit), status);
    }
    async getOrderDetails(req, orderId) {
        return this.vendorOrdersService.getVendorOrderDetails(req.user.vendorId, orderId);
    }
    async updateStatus(req, orderId, status) {
        return this.vendorOrdersService.updateOrderStatus(req.user.vendorId, orderId, status);
    }
};
exports.VendorOrdersController = VendorOrdersController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.VENDOR),
    (0, swagger_1.ApiOperation)({ summary: 'Get orders containing vendor products' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String]),
    __metadata("design:returntype", Promise)
], VendorOrdersController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.VENDOR),
    (0, swagger_1.ApiOperation)({ summary: 'Get order details' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VendorOrdersController.prototype, "getOrderDetails", null);
__decorate([
    (0, common_1.Post)(':id/status'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.VENDOR),
    (0, swagger_1.ApiOperation)({ summary: 'Update order status (Packed/Shipped)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], VendorOrdersController.prototype, "updateStatus", null);
exports.VendorOrdersController = VendorOrdersController = __decorate([
    (0, swagger_1.ApiTags)('Vendor Orders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('vendor-orders'),
    __metadata("design:paramtypes", [vendor_orders_service_1.VendorOrdersService])
], VendorOrdersController);
//# sourceMappingURL=vendor-orders.controller.js.map