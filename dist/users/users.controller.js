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