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
exports.TelecallerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TelecallerService = class TelecallerService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats(telecallerId) {
        const [myTasks, completed, pending] = await Promise.all([
            this.prisma.abandonedCheckout.count({ where: { agentId: telecallerId } }),
            this.prisma.abandonedCheckout.count({ where: { agentId: telecallerId, status: 'CONVERTED' } }),
            this.prisma.abandonedCheckout.count({ where: { agentId: telecallerId, status: { in: ['ASSIGNED', 'FOLLOW_UP'] } } })
        ]);
        return {
            myTasks,
            completed,
            pending,
            successRate: myTasks > 0 ? Math.round((completed / myTasks) * 100) : 0
        };
    }
    async getExpiringCoins() {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const expiringLedgers = await this.prisma.coinLedger.findMany({
            where: {
                expiresAt: {
                    gte: new Date(),
                    lte: nextWeek
                },
            },
            include: { user: true },
            take: 20
        });
        return expiringLedgers.map(l => ({
            name: l.user.name || 'Unknown',
            mobile: l.user.mobile,
            coins: l.amount,
            expiryDate: l.expiresAt,
            daysLeft: Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            lastOrder: 'Unknown'
        }));
    }
    async getCheckoutRecoveryLeads(telecallerId) {
        const leads = await this.prisma.abandonedCheckout.findMany({
            where: {
                OR: [
                    { agentId: telecallerId },
                    { status: 'NEW' }
                ]
            },
            include: { user: true },
            orderBy: { abandonedAt: 'desc' },
            take: 50
        });
        return leads.map(lead => {
            const finance = lead.financeSnapshot;
            const items = lead.cartSnapshot;
            return {
                id: lead.id,
                customerName: lead.user?.name || lead.guestInfo?.name || 'Guest',
                mobile: lead.user?.mobile || lead.guestInfo?.phone || 'N/A',
                cartValue: finance?.totalAmount || 0,
                itemCount: Array.isArray(items) ? items.length : 0,
                abandonedAt: lead.abandonedAt,
                priority: (finance?.totalAmount || 0) > 5000 ? 'High' : 'Normal',
                status: lead.status
            };
        });
    }
    async getSupportTickets() {
        const reports = await this.prisma.report.findMany({
            where: { status: 'PENDING' },
            include: { reporter: true },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        return reports.map(r => ({
            id: r.id,
            subject: `Report against ${r.targetType}`,
            description: r.reason,
            customerName: r.reporter.name,
            mobile: r.reporter.mobile,
            priority: 'Normal',
            createdAt: r.createdAt
        }));
    }
};
exports.TelecallerService = TelecallerService;
exports.TelecallerService = TelecallerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TelecallerService);
//# sourceMappingURL=telecaller.service.js.map