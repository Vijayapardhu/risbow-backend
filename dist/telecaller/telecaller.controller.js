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
exports.TelecallerController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const telecaller_service_1 = require("./telecaller.service");
let TelecallerController = class TelecallerController {
    constructor(telecallerService) {
        this.telecallerService = telecallerService;
    }
    async getDashboard(req) {
        const stats = await this.telecallerService.getDashboardStats(req.user.id);
        const expiringCoins = await this.telecallerService.getExpiringCoins();
        const checkoutRecovery = await this.telecallerService.getCheckoutRecoveryLeads(req.user.id);
        const supportTickets = await this.telecallerService.getSupportTickets();
        return {
            stats,
            expiringCoins,
            checkoutRecovery,
            supportTickets,
        };
    }
    async getExpiringCoins() {
        return this.telecallerService.getExpiringCoins();
    }
    async getCheckoutRecoveryLeads(req) {
        return this.telecallerService.getCheckoutRecoveryLeads(req.user.id);
    }
    async getSupportTickets() {
        return this.telecallerService.getSupportTickets();
    }
};
exports.TelecallerController = TelecallerController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
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
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
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
    __metadata("design:paramtypes", [telecaller_service_1.TelecallerService])
], TelecallerController);
//# sourceMappingURL=telecaller.controller.js.map