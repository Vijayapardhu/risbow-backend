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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAnalytics() {
        const [totalOrders, totalRooms, unlockedRooms, registredUsers, activeVendors] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.room.count(),
            this.prisma.room.count({ where: { status: client_1.RoomStatus.UNLOCKED } }),
            this.prisma.user.count(),
            this.prisma.vendor.count()
        ]);
        const ordersSum = await this.prisma.order.aggregate({
            _sum: { totalAmount: true },
        });
        const aov = totalOrders > 0 ? (ordersSum._sum.totalAmount || 0) / totalOrders : 0;
        return {
            dau: registredUsers,
            totalOrders,
            totalRevenue: ordersSum._sum.totalAmount || 0,
            aov,
            rooms: {
                total: totalRooms,
                unlocked: unlockedRooms,
                unlockRate: totalRooms > 0 ? (unlockedRooms / totalRooms) * 100 : 0
            },
            vendors: activeVendors
        };
    }
    async createBulkRooms(count) {
        const rooms = [];
        for (let i = 0; i < count; i++) {
            rooms.push({
                name: `Weekly Offer Room #${Math.floor(Math.random() * 1000)}`,
                size: 4,
                unlockMinOrders: 3,
                unlockMinValue: 1000,
                offerId: 'WEEKLY_SPECIAL',
                startAt: new Date(),
                endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                createdById: 'admin_system_id',
            });
        }
        return { created: count, message: "Simulated bulk creation" };
    }
    async approveBanner(bannerId) {
        return this.prisma.banner.update({
            where: { id: bannerId },
            data: { status: 'ACTIVE' }
        });
    }
    async verifyVendor(vendorId) {
        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: { isGstVerified: true }
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map