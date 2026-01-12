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
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    getAppConfig() {
        return this.adminService.getAppConfig();
    }
    updateAppConfig(body) {
        return this.adminService.updateAppConfig(body);
    }
    async analyzeUser(id) {
        return this.adminService.calculateUserRisk(id);
    }
    getAuditLogs(limit) {
        return this.adminService.getAuditLogs(limit);
    }
    getStats() {
        return this.adminService.getAnalytics();
    }
    getDashboardKPIs(period) {
        return this.adminService.getDashboardKPIs(period);
    }
    getDashboardStats(period) {
        return this.adminService.getDashboardAnalytics(period);
    }
    getHealth() {
        return this.adminService.getSystemHealth();
    }
    getUsers(page, search) {
        return this.adminService.getUsers(Number(page) || 1, search);
    }
    exportUsers() {
        return this.adminService.exportUsers();
    }
    getUserDetails(id) {
        return this.adminService.getUserDetails(id);
    }
    updateUser(req, userId, body) {
        return this.adminService.updateUser(req.user.id, userId, body);
    }
    updateKyc(req, userId, body) {
        return this.adminService.updateKycStatus(req.user.id, userId, body.status, body.notes);
    }
    forceLogout(req, userId) {
        return this.adminService.forceLogout(req.user.id, userId);
    }
    toggleRefunds(req, userId, body) {
        return this.adminService.toggleRefunds(req.user.id, userId, body.disabled);
    }
    toggleCod(req, userId, body) {
        return this.adminService.toggleCod(req.user.id, userId, body.disabled);
    }
    updateRiskTag(req, userId, body) {
        return this.adminService.updateRiskTag(req.user.id, userId, body.tag);
    }
    updateValueTag(req, userId, body) {
        return this.adminService.updateValueTag(req.user.id, userId, body.tag);
    }
    addAdminNote(req, userId, body) {
        return this.adminService.addAdminNote(req.user.id, userId, body.note);
    }
    getUserCart(userId) {
        return this.adminService.getUserCart(userId);
    }
    updateCoins(req, userId, body) {
        return this.adminService.updateUserCoins(req.user.id, userId, body.amount, body.reason);
    }
    updateUserStatus(req, userId, body) {
        return this.adminService.updateUserStatus(req.user.id, userId, body.status, body.reason);
    }
    suspendUser(req, userId, body) {
        return this.adminService.suspendUser(req.user.id, userId, body.reason);
    }
    activateUser(req, userId) {
        return this.adminService.activateUser(req.user.id, userId);
    }
    banUser(req, userId, body) {
        return this.adminService.banUser(req.user.id, userId, body.reason);
    }
    deleteUser(req, userId) {
        return this.adminService.deleteUser(req.user.id, userId);
    }
    getUserOrders(userId, limit) {
        return this.adminService.getUserOrders(userId, Number(limit) || 20);
    }
    getUserWishlist(userId) {
        return this.adminService.getUserWishlist(userId);
    }
    getUserAddresses(userId) {
        return this.adminService.getUserAddresses(userId);
    }
    sendUserNotification(userId, body) {
        return this.adminService.sendUserNotification(userId, body.title, body.message);
    }
    resetUserPassword(req, userId) {
        return this.adminService.resetUserPassword(req.user.id, userId);
    }
    getUserActivity(userId) {
        return this.adminService.getUserActivity(userId);
    }
    getVendors(status) {
        return this.adminService.getVendors(status);
    }
    approveVendor(req, id, body) {
        return this.adminService.approveVendor(req.user.id, id, body.approved, body.reason);
    }
    getAllRooms() {
        return this.adminService.getAllRooms();
    }
    createRoom(req, body) {
        return this.adminService.createRoom(req.user.id, body);
    }
    getAllOrders(limit, search, status) {
        return this.adminService.getAllOrders(limit, search, status);
    }
    getOrderById(id) {
        return this.adminService.getOrderById(id);
    }
    updateOrderStatus(req, id, body) {
        return this.adminService.updateOrderStatus(req.user.id, id, body.status, body.logistics);
    }
    getBanners() {
        return this.adminService.getBanners();
    }
    createBanner(req, body) {
        return this.adminService.createBanner(req.user.id, body);
    }
    toggleBanner(id, isActive) {
        return this.adminService.toggleBannerStatus(id, isActive);
    }
    sendBroadcast(req, body) {
        return this.adminService.sendBroadcast(req.user.id, body.title, body.body, body.audience);
    }
    getChartData() {
        return this.adminService.getAnalytics();
    }
    getCategories() {
        return this.adminService.getCategories();
    }
    createCategory(body) {
        return this.adminService.createCategory(body);
    }
    getCategory(id) {
        return this.adminService.getCategoryById(id);
    }
    deleteCategory(id) {
        return this.adminService.deleteCategory(id);
    }
    updateCategory(id, body) {
        return this.adminService.updateCategory(id, body);
    }
    updateCategoryPatch(id, body) {
        return this.adminService.updateCategory(id, body);
    }
    updateCommission(req, id, rate) {
        return this.adminService.updateVendorCommission(req.user.id, id, rate);
    }
    createProduct(body) {
        return this.adminService.createProduct(body);
    }
    bulkCreateProduct(body) {
        return this.adminService.bulkCreateProducts(body.products);
    }
    toggleProduct(id, isActive) {
        return this.adminService.toggleProductStatus(id, isActive);
    }
    deleteBanner(id) {
        return this.adminService.deleteBanner(id);
    }
    getSettings() {
        return this.adminService.getPlatformConfig();
    }
    updateSetting(body) {
        return this.adminService.updatePlatformConfig(body.key, body.value);
    }
    getCoupons() {
        return this.adminService.getCoupons();
    }
    createCoupon(body) {
        return this.adminService.createCoupon(body);
    }
    updateCoupon(id, body) {
        return this.adminService.updateCoupon(id, body);
    }
    deleteCoupon(id) {
        return this.adminService.deleteCoupon(id);
    }
    getCoinTransactions() {
        return this.adminService.getAllCoinTransactions();
    }
    getCoinStats() {
        return this.adminService.getCoinStats();
    }
    getReviews() {
        return this.adminService.getPendingReviews();
    }
    deleteReview(id) {
        return this.adminService.deleteReview(id);
    }
    getReports(status) {
        return this.adminService.getReports(status);
    }
    resolveReport(id, action) {
        return this.adminService.resolveReport(id, action);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAppConfig", null);
__decorate([
    (0, common_1.Post)('config'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateAppConfig", null);
__decorate([
    (0, common_1.Post)('users/:id/analyze'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "analyzeUser", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('dashboard/kpis'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDashboardKPIs", null);
__decorate([
    (0, common_1.Get)('dashboard/stats'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)('users/export/csv'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "exportUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserDetails", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Post)('users/:id/kyc'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateKyc", null);
__decorate([
    (0, common_1.Post)('users/:id/force-logout'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "forceLogout", null);
__decorate([
    (0, common_1.Post)('users/:id/toggle-refunds'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "toggleRefunds", null);
__decorate([
    (0, common_1.Post)('users/:id/toggle-cod'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "toggleCod", null);
__decorate([
    (0, common_1.Post)('users/:id/risk-tag'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateRiskTag", null);
__decorate([
    (0, common_1.Post)('users/:id/value-tag'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateValueTag", null);
__decorate([
    (0, common_1.Post)('users/:id/notes'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addAdminNote", null);
__decorate([
    (0, common_1.Get)('users/:id/cart'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserCart", null);
__decorate([
    (0, common_1.Post)('users/:id/coins'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCoins", null);
__decorate([
    (0, common_1.Post)('users/:id/status'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.Post)('users/:id/suspend'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Post)('users/:id/activate'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "activateUser", null);
__decorate([
    (0, common_1.Post)('users/:id/ban'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "banUser", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('users/:id/orders'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserOrders", null);
__decorate([
    (0, common_1.Get)('users/:id/wishlist'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserWishlist", null);
__decorate([
    (0, common_1.Get)('users/:id/addresses'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserAddresses", null);
__decorate([
    (0, common_1.Post)('users/:id/notify'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "sendUserNotification", null);
__decorate([
    (0, common_1.Post)('users/:id/reset-password'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "resetUserPassword", null);
__decorate([
    (0, common_1.Get)('users/:id/activity'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserActivity", null);
__decorate([
    (0, common_1.Get)('vendors'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getVendors", null);
__decorate([
    (0, common_1.Post)('vendors/:id/approve'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveVendor", null);
__decorate([
    (0, common_1.Get)('rooms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllRooms", null);
__decorate([
    (0, common_1.Post)('rooms'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createRoom", null);
__decorate([
    (0, common_1.Get)('orders'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllOrders", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getOrderById", null);
__decorate([
    (0, common_1.Post)('orders/:id/status'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateOrderStatus", null);
__decorate([
    (0, common_1.Get)('banners'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getBanners", null);
__decorate([
    (0, common_1.Post)('banners'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createBanner", null);
__decorate([
    (0, common_1.Post)('banners/:id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "toggleBanner", null);
__decorate([
    (0, common_1.Post)('notifications/broadcast'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "sendBroadcast", null);
__decorate([
    (0, common_1.Get)('analytics/chart-data'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getChartData", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Post)('categories'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Post)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCategoryPatch", null);
__decorate([
    (0, common_1.Post)('vendors/:id/commission'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('rate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCommission", null);
__decorate([
    (0, common_1.Post)('products'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Post)('products/bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "bulkCreateProduct", null);
__decorate([
    (0, common_1.Post)('products/:id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "toggleProduct", null);
__decorate([
    (0, common_1.Delete)('banners/:id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteBanner", null);
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('settings'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateSetting", null);
__decorate([
    (0, common_1.Get)('coupons'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCoupons", null);
__decorate([
    (0, common_1.Post)('coupons'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createCoupon", null);
__decorate([
    (0, common_1.Patch)('coupons/:id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCoupon", null);
__decorate([
    (0, common_1.Delete)('coupons/:id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteCoupon", null);
__decorate([
    (0, common_1.Get)('coins/transactions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCoinTransactions", null);
__decorate([
    (0, common_1.Get)('coins/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCoinStats", null);
__decorate([
    (0, common_1.Get)('reviews'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getReviews", null);
__decorate([
    (0, common_1.Delete)('reviews/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteReview", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getReports", null);
__decorate([
    (0, common_1.Post)('reports/:id/resolve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('action')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "resolveReport", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map