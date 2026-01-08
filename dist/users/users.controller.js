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
exports.ReferralsController = exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const user_dto_1 = require("./dto/user.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const coins_service_1 = require("../coins/coins.service");
let UsersController = class UsersController {
    constructor(usersService, coinsService) {
        this.usersService = usersService;
        this.coinsService = coinsService;
    }
    async getProfile(req) {
        const user = await this.usersService.findOne(req.user.id);
        return user;
    }
    async updateProfile(req, updateUserDto) {
        return this.usersService.update(req.user.id, updateUserDto);
    }
    async getCoins(req) {
        const balance = await this.coinsService.getBalance(req.user.id);
        const ledger = await this.coinsService.getLedger(req.user.id);
        return Object.assign(Object.assign({}, balance), { ledger });
    }
    async getOrders(req, limit) {
        return this.usersService.getUserOrders(req.user.id, Number(limit) || 50);
    }
    async getOrderDetails(req, orderId) {
        return this.usersService.getOrderById(req.user.id, orderId);
    }
    async getWishlist(req) {
        return this.usersService.getWishlist(req.user.id);
    }
    async addToWishlist(req, productId) {
        return this.usersService.addToWishlist(req.user.id, productId);
    }
    async removeFromWishlist(req, productId) {
        return this.usersService.removeFromWishlist(req.user.id, productId);
    }
    async getNotifications(req, limit) {
        return this.usersService.getNotifications(req.user.id, Number(limit) || 50);
    }
    async markNotificationRead(req, notificationId) {
        return this.usersService.markNotificationRead(req.user.id, notificationId);
    }
    async getAddresses(req) {
        return this.usersService.getAddresses(req.user.id);
    }
    async createAddress(req, addressData) {
        return this.usersService.createAddress(req.user.id, addressData);
    }
    async updateAddress(req, id, addressData) {
        return this.usersService.updateAddress(req.user.id, id, addressData);
    }
    async updateAddressAlt(req, id, addressData) {
        return this.usersService.updateAddress(req.user.id, id, addressData);
    }
    async deleteAddress(req, id) {
        return this.usersService.deleteAddress(req.user.id, id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('me/coins'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCoins", null);
__decorate([
    (0, common_1.Get)('me/orders'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Get)('me/orders/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getOrderDetails", null);
__decorate([
    (0, common_1.Get)('me/wishlist'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getWishlist", null);
__decorate([
    (0, common_1.Post)('me/wishlist/:productId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "addToWishlist", null);
__decorate([
    (0, common_1.Delete)('me/wishlist/:productId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removeFromWishlist", null);
__decorate([
    (0, common_1.Get)('me/notifications'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Post)('me/notifications/:id/read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "markNotificationRead", null);
__decorate([
    (0, common_1.Get)('me/addresses'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAddresses", null);
__decorate([
    (0, common_1.Post)('me/addresses'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createAddress", null);
__decorate([
    (0, common_1.Patch)('me/addresses/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateAddress", null);
__decorate([
    (0, common_1.Post)('me/addresses/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateAddressAlt", null);
__decorate([
    (0, common_1.Post)('me/addresses/:id/delete'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteAddress", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        coins_service_1.CoinsService])
], UsersController);
let ReferralsController = class ReferralsController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getReferralInfo(req) {
        const user = await this.usersService.findOne(req.user.id);
        return { referralCode: user.referralCode };
    }
    async share(req) {
        const user = await this.usersService.findOne(req.user.id);
        const linkBase = process.env.APP_BASE_URL || 'https://risbow.app';
        return {
            referralCode: user.referralCode,
            link: `${linkBase}/ref/${user.referralCode}`
        };
    }
    async claimReferral(req, dto) {
        return this.usersService.claimReferral(req.user.id, dto.refCode);
    }
};
exports.ReferralsController = ReferralsController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralsController.prototype, "getReferralInfo", null);
__decorate([
    (0, common_1.Get)('share'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralsController.prototype, "share", null);
__decorate([
    (0, common_1.Post)('claim'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_dto_1.ReferralClaimDto]),
    __metadata("design:returntype", Promise)
], ReferralsController.prototype, "claimReferral", null);
exports.ReferralsController = ReferralsController = __decorate([
    (0, common_1.Controller)('referrals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], ReferralsController);
//# sourceMappingURL=users.controller.js.map