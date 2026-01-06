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
exports.CoinsController = void 0;
const common_1 = require("@nestjs/common");
const coins_service_1 = require("./coins.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const coin_dto_1 = require("./dto/coin.dto");
let CoinsController = class CoinsController {
    constructor(coinsService) {
        this.coinsService = coinsService;
    }
    async credit(dto) {
        return this.coinsService.credit(dto.userId, dto.amount, dto.source);
    }
    async debit(dto) {
        return this.coinsService.debit(dto.userId, dto.amount, dto.source);
    }
    async redeem(req, amount) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Amount must be positive');
        }
        return this.coinsService.debit(req.user.id, amount, coin_dto_1.CoinSource.SPEND_ORDER);
    }
};
exports.CoinsController = CoinsController;
__decorate([
    (0, common_1.Post)('credit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [coin_dto_1.CreditCoinDto]),
    __metadata("design:returntype", Promise)
], CoinsController.prototype, "credit", null);
__decorate([
    (0, common_1.Post)('debit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [coin_dto_1.DebitCoinDto]),
    __metadata("design:returntype", Promise)
], CoinsController.prototype, "debit", null);
__decorate([
    (0, common_1.Post)('redeem'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('amount', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], CoinsController.prototype, "redeem", null);
exports.CoinsController = CoinsController = __decorate([
    (0, common_1.Controller)('coins'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [coins_service_1.CoinsService])
], CoinsController);
//# sourceMappingURL=coins.controller.js.map