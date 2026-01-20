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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats() {
        const salesAgg = await this.prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } }
        });
        const totalOrders = await this.prisma.order.count();
        const totalUsers = await this.prisma.user.count({ where: { role: 'CUSTOMER' } });
        const activeRooms = await this.prisma.room.count({ where: { status: 'ACTIVE' } });
        const activeVendors = await this.prisma.user.count({ where: { role: 'VENDOR' } });
        return {
            gmv: salesAgg._sum.totalAmount || 0,
            totalOrders,
            totalUsers,
            activeRooms,
            activeVendors
        };
    }
    async getSalesChart(period = 'week') {
        const days = period === 'week' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const orders = await this.prisma.order.findMany({
            where: {
                createdAt: { gte: startDate },
                status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
            },
            select: { createdAt: true, totalAmount: true }
        });
        const grouped = orders.reduce((acc, order) => {
            const date = order.createdAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + order.totalAmount;
            return acc;
        }, {});
        const result = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                sales: grouped[dateStr] || 0
            });
        }
        return result.reverse();
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map