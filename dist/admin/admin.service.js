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
        const [totalOrders, totalRooms, unlockedRooms, registredUsers, activeVendors, ordersSum, lowStockProducts] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.room.count(),
            this.prisma.room.count({ where: { status: client_1.RoomStatus.UNLOCKED } }),
            this.prisma.user.count(),
            this.prisma.vendor.count({ where: { kycStatus: 'APPROVED' } }),
            this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
            this.prisma.product.count({ where: { stock: { lte: 10 } } })
        ]);
        const totalRevenue = ordersSum._sum.totalAmount || 0;
        const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const monthlyRevenue = [
            { month: 'Jan', amount: totalRevenue * 0.1 },
            { month: 'Feb', amount: totalRevenue * 0.12 },
            { month: 'Mar', amount: totalRevenue * 0.15 },
            { month: 'Apr', amount: totalRevenue * 0.2 },
            { month: 'May', amount: totalRevenue * 0.18 },
            { month: 'Jun', amount: totalRevenue * 0.25 },
        ];
        return {
            totalRevenue,
            totalOrders,
            activeRooms: totalRooms,
            newVendors: activeVendors,
            dau: registredUsers,
            aov,
            monthlyRevenue,
            alerts: [
                { type: 'CRITICAL', message: `${lowStockProducts} products have low stock`, time: 'Now' },
                { type: 'INFO', message: `${unlockedRooms} rooms unlocked this week`, time: '2h ago' }
            ],
            trends: {
                revenue: '+12.5%',
                rooms: '+5%',
                orders: '+8.2%',
                vendors: '+2'
            }
        };
    }
    async getUsers(page = 1, search) {
        const take = 20;
        const skip = (page - 1) * take;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
            this.prisma.user.count({ where })
        ]);
        return { users, total, pages: Math.ceil(total / take) };
    }
    async updateUserCoins(adminId, userId, amount, reason) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const newBalance = (user.coinsBalance || 0) + amount;
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coinsBalance: newBalance }
            });
            await tx.auditLog.create({
                data: {
                    adminId,
                    entity: 'USER',
                    targetId: userId,
                    action: 'UPDATE_COINS',
                    details: { amount, reason, oldBalance: user.coinsBalance || 0, newBalance }
                }
            });
            return updatedUser;
        });
    }
    async getAllOrders(limit = 50, search, status) {
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { mobile: { contains: search, mode: 'insensitive' } } },
            ];
        }
        return this.prisma.order.findMany({
            where,
            take: Number(limit) || 50,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true, mobile: true } } }
        });
    }
    async getVendors(status = 'ALL') {
        const where = {};
        if (status && status !== 'ALL') {
            where.kycStatus = status;
        }
        return this.prisma.vendor.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }
    async approveVendor(adminId, id, approved) {
        const newStatus = approved ? 'APPROVED' : 'REJECTED';
        const vendor = await this.prisma.vendor.findUnique({ where: { id } });
        if (!vendor)
            throw new common_1.NotFoundException('Vendor not found');
        const updated = await this.prisma.vendor.update({
            where: { id },
            data: { kycStatus: newStatus }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'VENDOR',
                targetId: id,
                action: approved ? 'APPROVE' : 'REJECT',
                details: { previousStatus: vendor.kycStatus, newStatus }
            }
        });
        return updated;
    }
    async getAllRooms() {
        return this.prisma.room.findMany({ orderBy: { startAt: 'desc' } });
    }
    async createRoom(adminId, data) {
        if (typeof data.startAt === 'string')
            data.startAt = new Date(data.startAt);
        if (typeof data.endAt === 'string')
            data.endAt = new Date(data.endAt);
        return this.prisma.room.create({
            data: Object.assign(Object.assign({}, data), { createdById: adminId })
        });
    }
    async getBanners() {
        return this.prisma.banner.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async addBanner(data) {
        return this.prisma.banner.create({ data });
    }
    async deleteBanner(id) {
        return this.prisma.banner.delete({ where: { id } });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map