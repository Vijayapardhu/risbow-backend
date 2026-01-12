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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelecallerController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const admin_service_1 = require("../admin/admin.service");
let TelecallerController = class TelecallerController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getDashboard() {
        return {
            stats: {
                myTasks: 15,
                completed: 8,
                pending: 7,
                successRate: 65,
            },
            expiringCoins: await this.getExpiringCoins(),
            checkoutRecovery: await this.getCheckoutRecoveryLeads(),
            supportTickets: await this.getSupportTickets(),
        };
    }
    async getExpiringCoins() {
        return [
            {
                name: 'Rajesh Kumar',
                mobile: '+91 98765 00001',
                coins: 500,
                expiryDate: '2026-01-10',
                daysLeft: 2,
                lastOrder: '15 days ago',
            },
        ];
    }
    async getCheckoutRecoveryLeads() {
        return [
            {
                customerName: 'Sneha Reddy',
                mobile: '+91 98765 00004',
                cartValue: 5000,
                itemCount: 3,
                abandonedAt: '2 hours ago',
                priority: 'High',
            },
        ];
    }
    async getSupportTickets() {
        return [
            {
                id: 'TKT001',
                subject: 'Order not delivered',
                description: 'Customer complaining about delayed delivery',
                customerName: 'Rahul Verma',
                mobile: '+91 98765 00006',
                priority: 'High',
                createdAt: '1 hour ago',
            },
        ];
    }
};
exports.TelecallerController = TelecallerController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TelecallerController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('expiring-coins'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TelecallerController.prototype, "getExpiringCoins", null);
__decorate([
    (0, common_1.Get)('checkout-recovery'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TelecallerController.prototype, "getCheckoutRecoveryLeads", null);
__decorate([
    (0, common_1.Get)('support-tickets'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TelecallerController.prototype, "getSupportTickets", null);
exports.TelecallerController = TelecallerController = __decorate([
    (0, common_1.Controller)('telecaller'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('TELECALLER', 'ADMIN', 'SUPER_ADMIN'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], TelecallerController);
//# sourceMappingURL=telecaller.controller.js.map