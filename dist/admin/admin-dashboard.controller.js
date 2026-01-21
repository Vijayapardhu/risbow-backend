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
exports.AdminDashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_dashboard_service_1 = require("./admin-dashboard.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let AdminDashboardController = class AdminDashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getDashboardData(period = 'Last 7 Days') {
        return this.dashboardService.getDashboardData(period);
    }
    async getKPIs(period = 'Last 7 Days') {
        return this.dashboardService.getKPIs(period);
    }
    async getOrderFunnel() {
        return this.dashboardService.getOrderFunnel();
    }
    async getRevenueIntelligence(period = 'Last 7 Days') {
        return this.dashboardService.getRevenueIntelligence(period);
    }
    async getActionItems() {
        return this.dashboardService.getActionItems();
    }
    async getCustomerSignals(period = 'Last 7 Days') {
        return this.dashboardService.getCustomerSignals(period);
    }
    async getSystemHealth() {
        return this.dashboardService.getSystemHealth();
    }
};
exports.AdminDashboardController = AdminDashboardController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getDashboardData", null);
__decorate([
    (0, common_1.Get)('kpis'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getKPIs", null);
__decorate([
    (0, common_1.Get)('order-funnel'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getOrderFunnel", null);
__decorate([
    (0, common_1.Get)('revenue-intelligence'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getRevenueIntelligence", null);
__decorate([
    (0, common_1.Get)('action-items'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getActionItems", null);
__decorate([
    (0, common_1.Get)('customer-signals'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getCustomerSignals", null);
__decorate([
    (0, common_1.Get)('system-health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getSystemHealth", null);
exports.AdminDashboardController = AdminDashboardController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('admin/dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __metadata("design:paramtypes", [admin_dashboard_service_1.AdminDashboardService])
], AdminDashboardController);
//# sourceMappingURL=admin-dashboard.controller.js.map