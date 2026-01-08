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
exports.CheckoutController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const checkout_service_1 = require("./checkout.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let CheckoutController = class CheckoutController {
    constructor(checkoutService) {
        this.checkoutService = checkoutService;
    }
    async captureCheckout(body) {
        return this.checkoutService.captureCheckout(body);
    }
    async getLeads(req, page, status, urgency) {
        const user = req.user;
        const take = 20;
        const skip = (Number(page || 1) - 1) * take;
        const where = {};
        if (user.role === 'TELECALLER' || user.role === 'SUPPORT') {
            where.agentId = user.id;
        }
        if (status)
            where.status = status;
        return this.checkoutService.getCheckouts({
            take,
            skip,
            where,
            orderBy: { createdAt: 'desc' }
        });
    }
    async getLeadDetails(req, id) {
        const lead = await this.checkoutService.getCheckoutById(id);
        if (!lead)
            return null;
        const user = req.user;
        if (user.role === 'TELECALLER') {
            if (lead.agentId !== user.id) {
                throw new common_1.ForbiddenException('You are not assigned to this lead');
            }
        }
        return lead;
    }
    async assignLead(req, body) {
        const user = req.user;
        let targetAgentId = body.agentId;
        if (!targetAgentId || targetAgentId === 'CURRENT_ADMIN_ID') {
            targetAgentId = user.id;
        }
        if (user.role === 'TELECALLER' && targetAgentId !== user.id) {
            throw new common_1.ForbiddenException('Telecallers can only assign leads to themselves');
        }
        return this.checkoutService.assignLead(body.checkoutId, targetAgentId);
    }
    async addFollowup(req, body) {
        const user = req.user;
        let agentId = body.agentId;
        if (!agentId || agentId === 'CURRENT_ADMIN_ID') {
            agentId = user.id;
        }
        if (user.role === 'TELECALLER' && agentId !== user.id) {
            throw new common_1.ForbiddenException('Cannot log followup for another agent');
        }
        return this.checkoutService.addFollowup({
            checkoutId: body.checkoutId,
            agentId: agentId,
            note: body.note,
            outcome: body.outcome
        });
    }
};
exports.CheckoutController = CheckoutController;
__decorate([
    (0, common_1.Post)('capture'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "captureCheckout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/leads'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('urgency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Boolean]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "getLeads", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin/leads/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "getLeadDetails", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('admin/assign'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "assignLead", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('admin/followup'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "addFollowup", null);
exports.CheckoutController = CheckoutController = __decorate([
    (0, common_1.Controller)('checkout'),
    __metadata("design:paramtypes", [checkout_service_1.CheckoutService])
], CheckoutController);
//# sourceMappingURL=checkout.controller.js.map