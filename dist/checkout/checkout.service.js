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
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CheckoutService = class CheckoutService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async captureCheckout(data) {
        const persuasionMetadata = await this.calculatePersuasionMetadata(data.cartItems);
        const checkoutData = {
            user: data.userId ? { connect: { id: data.userId } } : undefined,
            guestInfo: data.guestInfo || {},
            cartSnapshot: data.cartItems,
            financeSnapshot: data.financeDetails,
            metadata: persuasionMetadata,
            status: 'NEW',
        };
        return this.prisma.abandonedCheckout.create({
            data: checkoutData,
        });
    }
    async calculatePersuasionMetadata(cartItems) {
        let lowStockCount = 0;
        cartItems.forEach(item => {
            if (item.quantity > 5)
                lowStockCount++;
        });
        const stockStatus = lowStockCount > 0 ? 'LOW' : 'MEDIUM';
        const urgencyReason = stockStatus === 'LOW'
            ? `High demand! ${lowStockCount} items in your cart are running low.`
            : 'Order now for faster delivery.';
        return {
            stock_status: stockStatus,
            trending_score: 85,
            active_offers: ['FREE_DELIVERY'],
            estimated_delivery: '2-3 Days',
            urgency_reason: urgencyReason,
            source: 'WEB'
        };
    }
    async getCheckouts(params) {
        const { skip, take, cursor, where, orderBy } = params;
        return this.prisma.abandonedCheckout.findMany({
            skip,
            take,
            cursor,
            where,
            orderBy,
            include: {
                user: true,
                agent: true,
                followups: true
            }
        });
    }
    async getCheckoutById(id) {
        return this.prisma.abandonedCheckout.findUnique({
            where: { id },
            include: {
                user: true,
                agent: true,
                followups: {
                    include: { agent: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
    }
    async assignLead(checkoutId, agentId) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
        return this.prisma.abandonedCheckout.update({
            where: { id: checkoutId },
            data: {
                status: 'ASSIGNED',
                agentId,
                lockedUntil
            },
            include: { agent: true }
        });
    }
    async addFollowup(data) {
        const followup = await this.prisma.checkoutFollowup.create({
            data: {
                checkoutId: data.checkoutId,
                agentId: data.agentId,
                note: data.note,
                outcome: data.outcome
            }
        });
        let newStatus = 'FOLLOW_UP';
        if (data.outcome === 'CONVERTED')
            newStatus = 'CONVERTED';
        if (data.outcome === 'DROPPED')
            newStatus = 'DROPPED';
        await this.prisma.abandonedCheckout.update({
            where: { id: data.checkoutId },
            data: { status: newStatus }
        });
        return followup;
    }
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map