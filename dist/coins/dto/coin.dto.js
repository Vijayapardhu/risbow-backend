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
exports.DebitCoinDto = exports.CreditCoinDto = exports.CoinSource = void 0;
const class_validator_1 = require("class-validator");
var CoinSource;
(function (CoinSource) {
    CoinSource["REFERRAL"] = "REFERRAL";
    CoinSource["ORDER_REWARD"] = "ORDER_REWARD";
    CoinSource["ADMIN_CREDIT"] = "ADMIN_CREDIT";
    CoinSource["SPEND_ORDER"] = "SPEND_ORDER";
    CoinSource["BANNER_PURCHASE"] = "BANNER_PURCHASE";
})(CoinSource || (exports.CoinSource = CoinSource = {}));
class CreditCoinDto {
}
exports.CreditCoinDto = CreditCoinDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreditCoinDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreditCoinDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(CoinSource),
    __metadata("design:type", String)
], CreditCoinDto.prototype, "source", void 0);
class DebitCoinDto {
}
exports.DebitCoinDto = DebitCoinDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DebitCoinDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], DebitCoinDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(CoinSource),
    __metadata("design:type", String)
], DebitCoinDto.prototype, "source", void 0);
//# sourceMappingURL=coin.dto.js.map