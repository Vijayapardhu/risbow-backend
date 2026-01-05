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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    checkAdmin(secret) {
        if (secret !== 'admin-secret-123') {
            throw new common_1.UnauthorizedException('Not Admin');
        }
    }
    async getAnalytics(secret) {
        this.checkAdmin(secret);
        return this.adminService.getAnalytics();
    }
    async createBulkRooms(secret, count) {
        this.checkAdmin(secret);
        return this.adminService.createBulkRooms(count || 5);
    }
    async approveBanner(secret, id) {
        this.checkAdmin(secret);
        return this.adminService.approveBanner(id);
    }
    async verifyVendor(secret, id) {
        this.checkAdmin(secret);
        return this.adminService.verifyVendor(id);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('analytics'),
    __param(0, (0, common_1.Headers)('x-admin-secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Post)('rooms'),
    __param(0, (0, common_1.Headers)('x-admin-secret')),
    __param(1, (0, common_1.Body)('count')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createBulkRooms", null);
__decorate([
    (0, common_1.Patch)('banner/:id/approve'),
    __param(0, (0, common_1.Headers)('x-admin-secret')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approveBanner", null);
__decorate([
    (0, common_1.Patch)('vendor/:id/verify'),
    __param(0, (0, common_1.Headers)('x-admin-secret')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyVendor", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map