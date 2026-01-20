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
exports.RefundsController = void 0;
const common_1 = require("@nestjs/common");
const refunds_service_1 = require("./refunds.service");
const refund_dto_1 = require("./dto/refund.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let RefundsController = class RefundsController {
    constructor(refundsService) {
        this.refundsService = refundsService;
    }
    requestRefund(req, dto) {
        return this.refundsService.requestRefund(req.user.id, dto);
    }
    getMyRefunds(req) {
        return this.refundsService.getRefunds(req.user.id);
    }
    processRefund(req, id, dto) {
        return this.refundsService.processRefund(req.user.id, id, dto);
    }
};
exports.RefundsController = RefundsController;
__decorate([
    (0, common_1.Post)('request'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Request a refund for an order' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, refund_dto_1.CreateRefundRequestDto]),
    __metadata("design:returntype", void 0)
], RefundsController.prototype, "requestRefund", null);
__decorate([
    (0, common_1.Get)('my-refunds'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user refunds' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RefundsController.prototype, "getMyRefunds", null);
__decorate([
    (0, common_1.Post)(':id/process'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Process a refund (Admin)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, refund_dto_1.ProcessRefundDto]),
    __metadata("design:returntype", void 0)
], RefundsController.prototype, "processRefund", null);
exports.RefundsController = RefundsController = __decorate([
    (0, swagger_1.ApiTags)('Refunds'),
    (0, common_1.Controller)('refunds'),
    __metadata("design:paramtypes", [refunds_service_1.RefundsService])
], RefundsController);
//# sourceMappingURL=refunds.controller.js.map