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
    async getDashboardKPIs(period = 'Last 7 Days') {
        const [totalOrders, totalProducts, totalShops, totalCustomers, ordersSum,] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.product.count(),
            this.prisma.vendor.count(),
            this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
            this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
        ]);
        const totalRevenue = ordersSum._sum.totalAmount || 0;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const conversionRate = 3.5;
        return {
            totalRevenue,
            totalOrders,
            activeCustomers: totalCustomers,
            conversionRate,
            averageOrderValue,
            totalProducts,
            totalShops,
            totalCustomers,
        };
    }
    async getDashboardAnalytics(period = 'Last 7 Days') {
        const stats = await this.getAnalytics();
        return {
            orderData: stats.revenue.map(r => ({ name: r.date, orders: Math.floor(r.amount / 100) + 1 })),
            userData: [
                { name: 'Customers', value: stats.dau },
                { name: 'Vendors', value: stats.newVendors },
                { name: 'Drivers', value: 3 },
            ],
            topProducts: stats.topProducts,
            recentOrders: stats.activity.filter(a => a.type === 'ORDER'),
            trendingShops: stats.activity.filter(a => a.type === 'VENDOR').map(v => ({
                id: v.id,
                name: v.subtitle,
                orders: Math.floor(Math.random() * 50),
                rating: 4.5 + Math.random() * 0.5
            }))
        };
    }
    async getAnalytics() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const [totalOrders, totalRooms, unlockedRooms, registredUsers, activeVendors, ordersSum, lowStockProducts, recentOrders, categoryStats, topProducts, recentAuditLogs, newVendors] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.room.count(),
            this.prisma.room.count({ where: { status: client_1.RoomStatus.UNLOCKED } }),
            this.prisma.user.count(),
            this.prisma.vendor.count({ where: { kycStatus: 'APPROVED' } }),
            this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
            this.prisma.product.count({ where: { stock: { lte: 10 } } }),
            this.prisma.order.findMany({
                where: { createdAt: { gte: sevenDaysAgo } },
                select: { id: true, createdAt: true, totalAmount: true, user: { select: { name: true } }, status: true },
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.product.groupBy({
                by: ['categoryId'],
                _count: { id: true }
            }),
            this.prisma.product.findMany({
                take: 5,
                orderBy: { price: 'desc' },
                select: { id: true, title: true, stock: true, price: true, isActive: true }
            }),
            this.prisma.auditLog.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.vendor.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { name: true, createdAt: true }
            })
        ]);
        const totalRevenue = ordersSum._sum.totalAmount || 0;
        const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const revenueMap = new Map();
        recentOrders.forEach(o => {
            const date = o.createdAt.toISOString().split('T')[0];
            revenueMap.set(date, (revenueMap.get(date) || 0) + o.totalAmount);
        });
        const revenueChart = Array.from(revenueMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));
        const categoryIds = categoryStats.map(c => c.categoryId);
        const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } });
        const categoriesChart = categoryStats.map(c => ({
            category: categories.find(cat => cat.id === c.categoryId)?.name || 'Unknown',
            count: c._count.id
        }));
        const activity = [
            ...recentOrders.slice(0, 5).map(o => ({
                id: o.id,
                title: `Order #${o.id.substring(0, 6)}`,
                subtitle: `${o.user?.name || 'User'} · ${o.totalAmount}`,
                type: 'ORDER',
                status: o.status,
                time: o.createdAt
            })),
            ...newVendors.map(v => ({
                id: v.name,
                title: 'New Vendor',
                subtitle: v.name,
                type: 'VENDOR',
                status: 'PENDING',
                time: v.createdAt
            })),
            ...recentAuditLogs.map(l => ({
                id: l.id,
                title: `Admin Action: ${l.action}`,
                subtitle: `Admin · ${l.entity}`,
                type: 'SYSTEM',
                status: 'LOG',
                time: l.createdAt
            }))
        ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);
        return {
            totalRevenue,
            totalOrders,
            activeRooms: totalRooms,
            newVendors: activeVendors,
            dau: registredUsers,
            aov,
            revenue: revenueChart,
            categories: categoriesChart,
            topProducts: topProducts.map(p => ({
                name: p.title,
                stock: p.stock.toString(),
                price: p.price,
                status: p.isActive ? 'Active' : 'Inactive',
                earnings: '-'
            })),
            activity,
            trends: {
                revenue: '+0%',
                orders: '+0%',
                vendors: '+0%'
            }
        };
    }
    async getUsers(page = 1, search, filters) {
        const take = 50;
        const skip = (page - 1) * take;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { id: { equals: search } }
            ];
        }
        if (filters) {
            if (filters.role)
                where.role = filters.role;
            if (filters.status)
                where.status = filters.status;
            if (filters.riskTag)
                where.riskTag = filters.riskTag;
            if (filters.valueTag)
                where.valueTag = filters.valueTag;
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                take,
                skip,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    mobile: true,
                    role: true,
                    status: true,
                    coinsBalance: true,
                    riskTag: true,
                    valueTag: true,
                    createdAt: true
                }
            }),
            this.prisma.user.count({ where })
        ]);
        return { users, total, pages: Math.ceil(total / take) };
    }
    async getUserDetails(id) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id },
                include: {
                    addresses: true,
                    receivedNotes: {
                        include: { admin: { select: { email: true } } },
                        orderBy: { createdAt: 'desc' }
                    },
                    orders: {
                        take: 20,
                        orderBy: { createdAt: 'desc' },
                        include: { payment: true }
                    },
                    reviews: { take: 5, orderBy: { createdAt: 'desc' } },
                }
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            let coinLedger = [];
            try {
                coinLedger = await this.prisma.coinLedger.findMany({
                    where: { userId: id },
                    take: 20,
                    orderBy: { createdAt: 'desc' }
                });
            }
            catch (ledgerError) {
                console.warn('Failed to fetch CoinLedger:', ledgerError.message);
            }
            const totalOrders = user.orders?.length || 0;
            const cancelledOrders = user.orders ? user.orders.filter(o => o.status === 'CANCELLED').length : 0;
            const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
            let derivedRiskTag = user.riskTag;
            if (cancellationRate > 50 && totalOrders > 3)
                derivedRiskTag = client_1.RiskTag.HIGH;
            else if (cancellationRate > 20 && totalOrders > 3)
                derivedRiskTag = client_1.RiskTag.MEDIUM;
            return {
                ...user,
                adminNotes: user.receivedNotes,
                coinLedger,
                riskStats: { totalOrders, cancellationRate, derivedRiskTag }
            };
        }
        catch (error) {
            console.error(`Error in getUserDetails for id ${id}:`, error);
            if (error instanceof common_1.NotFoundException)
                throw error;
            throw new Error(`Failed to fetch user details: ${error.message}`);
        }
    }
    async updateUser(adminId, userId, data) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.email !== undefined)
            updateData.email = data.email;
        if (data.mobile !== undefined)
            updateData.mobile = data.mobile;
        if (data.role !== undefined)
            updateData.role = data.role;
        if (data.riskTag !== undefined)
            updateData.riskTag = data.riskTag;
        if (data.valueTag !== undefined)
            updateData.valueTag = data.valueTag;
        if (data.status !== undefined)
            updateData.status = data.status;
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: updateData
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'UPDATE_USER',
                details: { previousData: { risk: user.riskTag, value: user.valueTag, status: user.status }, newData: updateData }
            }
        });
        return updatedUser;
    }
    async toggleCod(adminId, userId, disabled) {
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { isCodDisabled: disabled }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: disabled ? 'DISABLE_COD' : 'ENABLE_COD',
                details: {}
            }
        });
        return updated;
    }
    async updateRiskTag(adminId, userId, tag) {
        const validTags = ['LOW', 'MEDIUM', 'HIGH'];
        if (!validTags.includes(tag)) {
            throw new common_1.BadRequestException(`Invalid risk tag. Must be one of: ${validTags.join(', ')}`);
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const oldTag = user.riskTag;
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { riskTag: tag }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'UPDATE_RISK_TAG',
                details: { oldTag, newTag: tag }
            }
        });
        return updated;
    }
    async updateValueTag(adminId, userId, tag) {
        const validTags = ['NORMAL', 'VIP'];
        if (!validTags.includes(tag)) {
            throw new common_1.BadRequestException(`Invalid value tag. Must be one of: ${validTags.join(', ')}`);
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const oldTag = user.valueTag;
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { valueTag: tag }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'UPDATE_VALUE_TAG',
                details: { oldTag, newTag: tag }
            }
        });
        return updated;
    }
    async addAdminNote(adminId, userId, note) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const adminNote = await this.prisma.adminNote.create({
            data: {
                userId,
                adminId,
                note
            }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'ADD_NOTE',
                details: { noteId: adminNote.id }
            }
        });
        return adminNote;
    }
    async getUserCart(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                title: true,
                                price: true,
                                images: true,
                                stock: true,
                                isActive: true
                            }
                        }
                    }
                }
            }
        });
        if (!cart) {
            return { items: [], totalItems: 0, totalValue: 0 };
        }
        const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        return {
            id: cart.id,
            items: cart.items.map(item => ({
                id: item.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                product: item.product
            })),
            totalItems,
            totalValue
        };
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
            await tx.coinLedger.create({
                data: {
                    userId,
                    amount,
                    source: `ADMIN_${reason.toUpperCase().replace(/\s+/g, '_')}`,
                    referenceId: adminId
                }
            });
            await tx.auditLog.create({
                data: {
                    adminId,
                    entity: 'USER',
                    entityId: userId,
                    action: 'UPDATE_COINS',
                    details: { amount, reason, oldBalance: user.coinsBalance || 0, newBalance }
                }
            });
            return updatedUser;
        });
    }
    async updateUserStatus(adminId, userId, status, reason) {
        const validStatuses = ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING'];
        if (!validStatuses.includes(status)) {
            throw new common_1.BadRequestException(`Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const previousStatus = user.status || 'ACTIVE';
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { status: status }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: `UPDATE_STATUS_TO_${status}`,
                details: { reason, previousStatus, newStatus: status }
            }
        });
        return { success: true, user: updatedUser, message: `User status updated to ${status}` };
    }
    async suspendUser(adminId, userId, reason) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { status: 'SUSPENDED' }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'SUSPEND_USER',
                details: { reason, previousStatus: user.status || 'ACTIVE' }
            }
        });
        return { success: true, user: updatedUser, message: 'User suspended successfully' };
    }
    async activateUser(adminId, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { status: 'ACTIVE' }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'ACTIVATE_USER',
                details: { previousStatus: user.status || 'SUSPENDED' }
            }
        });
        return { success: true, user: updatedUser, message: 'User activated successfully' };
    }
    async banUser(adminId, userId, reason) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { status: 'BANNED' }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'BAN_USER',
                details: { reason, previousStatus: user.status || 'ACTIVE' }
            }
        });
        return { success: true, user: updatedUser, message: 'User banned successfully' };
    }
    async forceLogout(adminId, userId) {
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { forceLogoutAt: new Date() }
        });
        await this.prisma.auditLog.create({
            data: { adminId, entity: 'USER', entityId: userId, action: 'FORCE_LOGOUT' }
        });
        return { success: true, message: 'User sessions invalidated (timestamps updated)' };
    }
    async updateKycStatus(adminId, userId, status, notes) {
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { kycStatus: status }
        });
        if (notes) {
            await this.addAdminNote(adminId, userId, `KYC Update: ${status} - ${notes}`);
        }
        return updatedUser;
    }
    async toggleRefunds(adminId, userId, disabled) {
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { isRefundsDisabled: disabled }
        });
        await this.prisma.auditLog.create({
            data: { adminId, entity: 'USER', entityId: userId, action: 'TOGGLE_REFUNDS', details: { disabled } }
        });
        return updatedUser;
    }
    async exportUsers() {
        const users = await this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return users;
    }
    async calculateUserRisk(userId) {
        const orders = await this.prisma.order.findMany({
            where: { userId },
            select: { status: true, totalAmount: true }
        });
        if (orders.length === 0)
            return { risk: 'LOW', value: 'NORMAL' };
        const totalOrders = orders.length;
        const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
        const totalSpent = orders.reduce((sum, o) => sum + (o.status === 'DELIVERED' ? o.totalAmount : 0), 0);
        const cancelRate = cancelled / totalOrders;
        let newRisk = 'LOW';
        if (cancelRate > 0.5 && totalOrders > 3)
            newRisk = 'HIGH';
        else if (cancelRate > 0.2 && totalOrders > 3)
            newRisk = 'MEDIUM';
        let newValue = 'NORMAL';
        if (totalSpent > 50000)
            newValue = 'VIP';
        await this.prisma.user.update({
            where: { id: userId },
            data: { riskTag: newRisk, valueTag: newValue }
        });
        return { risk: newRisk, value: newValue, stats: { cancelRate, totalSpent } };
    }
    async deleteUser(adminId, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                status: 'BANNED',
                email: null,
                name: `Deleted User ${userId.substring(0, 6)}`
            }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'DELETE_USER',
                details: { deletedEmail: user.email, deletedName: user.name }
            }
        });
        return { success: true, message: 'User deleted successfully' };
    }
    async getUserOrders(userId, limit = 20) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const orders = await this.prisma.order.findMany({
            where: { userId },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                payment: true,
                address: true
            }
        });
        const stats = {
            totalOrders: orders.length,
            totalSpent: orders.reduce((sum, o) => sum + o.totalAmount, 0),
            completedOrders: orders.filter(o => o.status === 'DELIVERED').length,
            cancelledOrders: orders.filter(o => o.status === 'CANCELLED').length
        };
        return { orders, stats };
    }
    async getUserWishlist(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const wishlist = await this.prisma.wishlist.findMany({
            where: { userId },
            include: {
                product: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: true,
                        stock: true,
                        isActive: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return {
            items: wishlist,
            totalItems: wishlist.length
        };
    }
    async getUserAddresses(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const addresses = await this.prisma.address.findMany({
            where: { userId },
            orderBy: { isDefault: 'desc' }
        });
        return { addresses, total: addresses.length };
    }
    async sendUserNotification(userId, title, message) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const notification = await this.prisma.notification.create({
            data: {
                userId,
                title,
                body: message,
                type: 'ADMIN'
            }
        });
        return { success: true, notification, message: 'Notification sent successfully' };
    }
    async resetUserPassword(adminId, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: null }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'RESET_PASSWORD',
                details: { userEmail: user.email }
            }
        });
        return { success: true, message: 'Password reset successfully. User will need to set a new password on next login.' };
    }
    async getUserActivity(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const [orders, reviews, coinTransactions] = await Promise.all([
            this.prisma.order.findMany({
                where: { userId },
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: { id: true, status: true, totalAmount: true, createdAt: true }
            }),
            this.prisma.review.findMany({
                where: { userId },
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: { id: true, rating: true, comment: true, createdAt: true }
            }),
            this.prisma.coinLedger.findMany({
                where: { userId },
                take: 10,
                orderBy: { createdAt: 'desc' }
            })
        ]);
        const activities = [
            ...orders.map(o => ({
                type: 'ORDER',
                description: `Order #${o.id.substring(0, 8)} - ${o.status}`,
                amount: o.totalAmount,
                timestamp: o.createdAt
            })),
            ...reviews.map(r => ({
                type: 'REVIEW',
                description: `Reviewed product - ${r.rating} stars`,
                amount: null,
                timestamp: r.createdAt
            })),
            ...coinTransactions.map(c => ({
                type: 'COINS',
                description: `${c.amount > 0 ? 'Earned' : 'Spent'} ${Math.abs(c.amount)} coins - ${c.source}`,
                amount: c.amount,
                timestamp: c.createdAt
            }))
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20);
        return { activities, user: { id: user.id, name: user.name, email: user.email } };
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
                { awbNumber: { contains: search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.order.findMany({
            where,
            take: Number(limit) || 50,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true, mobile: true } },
                address: true
            }
        });
    }
    async getOrderById(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: { select: { id: true, name: true, email: true, mobile: true } },
                address: true
            }
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async updateOrderStatus(adminId, orderId, status, logistics) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException("Order not found");
        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: status,
                awbNumber: logistics?.awb,
                courierPartner: logistics?.courier
            }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'ORDER',
                entityId: orderId,
                action: 'UPDATE_STATUS',
                details: { oldStatus: order.status, newStatus: status, logistics }
            }
        });
        return updated;
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
    async approveVendor(adminId, id, approved, reason) {
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
                entityId: id,
                action: approved ? 'APPROVE' : 'REJECT',
                details: { previousStatus: vendor.kycStatus, newStatus, reason }
            }
        });
        return updated;
    }
    async updateVendorCommission(adminId, id, rate) {
        const vendor = await this.prisma.vendor.update({
            where: { id },
            data: { commissionRate: rate }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'VENDOR',
                entityId: id,
                action: 'UPDATE_COMMISSION',
                details: { newRate: rate }
            }
        });
        return vendor;
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
            data: {
                ...data,
                createdById: adminId,
            }
        });
    }
    async getProducts(categoryId, search) {
        const where = {};
        if (categoryId)
            where.categoryId = categoryId;
        if (search)
            where.title = { contains: search, mode: 'insensitive' };
        return this.prisma.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }
    async getCategories() {
        return this.prisma.category.findMany();
    }
    async createCategory(data) {
        return this.prisma.category.create({ data });
    }
    async createProduct(data) {
        if (data.stock)
            data.stock = Number(data.stock);
        if (data.price)
            data.price = Number(data.price);
        return this.prisma.product.create({ data });
    }
    async bulkCreateProducts(products) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        for (const p of products) {
            try {
                if (p.stock)
                    p.stock = Number(p.stock);
                if (p.price)
                    p.price = Number(p.price);
                if (!p.title || !p.price || !p.categoryId) {
                    throw new Error("Missing required fields (title, price, categoryId)");
                }
                await this.prisma.product.create({ data: p });
                results.success++;
            }
            catch (e) {
                results.failed++;
                results.errors.push({ title: p.title, error: e.message });
            }
        }
        return results;
    }
    async deleteCategory(id) {
        const children = await this.prisma.category.count({ where: { parentId: id } });
        if (children > 0)
            throw new Error("Cannot delete category with sub-categories");
        const products = await this.prisma.product.count({ where: { categoryId: id } });
        if (products > 0)
            throw new Error("Cannot delete category containing products");
        return this.prisma.category.delete({ where: { id } });
    }
    async toggleProductStatus(id, isActive) {
        return this.prisma.product.update({
            where: { id },
            data: { isActive: isActive }
        });
    }
    async getBanners() {
        return this.prisma.banner.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }
    async createBanner(adminId, data) {
        return this.prisma.banner.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate)
            }
        });
    }
    async toggleBannerStatus(id, isActive) {
        return this.prisma.banner.update({
            where: { id },
            data: { isActive }
        });
    }
    async sendBroadcast(adminId, title, body, audience) {
        const broadcast = await this.prisma.notification.create({
            data: {
                title,
                body,
                type: 'BROADCAST',
                targetAudience: audience,
                userId: null
            }
        });
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'MARKETING',
                entityId: broadcast.id,
                action: 'SEND_BROADCAST',
                details: { title, audience }
            }
        });
        return broadcast;
    }
    async deleteBanner(id) {
        return this.prisma.banner.delete({ where: { id } });
    }
    async getAuditLogs(limit = 50) {
        return this.prisma.auditLog.findMany({
            take: Number(limit),
            orderBy: { createdAt: 'desc' }
        });
    }
    async getPlatformConfig() {
        return this.prisma.platformConfig.findMany();
    }
    async updatePlatformConfig(key, value) {
        return this.prisma.platformConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
    }
    async getAppConfig() {
        const configs = await this.prisma.platformConfig.findMany();
        const configMap = {};
        for (const config of configs) {
            try {
                configMap[config.key] = JSON.parse(config.value);
            }
            catch {
                configMap[config.key] = config.value;
            }
        }
        return {
            maintenance_mode: configMap['MAINTENANCE_MODE'] ?? false,
            tagline: configMap['TAGLINE'] ?? 'Your Super Shopping App',
            min_app_version: configMap['MIN_APP_VERSION'] ?? '1.0.0',
            force_update: configMap['FORCE_UPDATE'] ?? false,
            announcement: configMap['ANNOUNCEMENT'] ?? null,
            ...configMap
        };
    }
    async updateAppConfig(data) {
        const updates = [];
        for (const [key, value] of Object.entries(data)) {
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            updates.push(this.prisma.platformConfig.upsert({
                where: { key: key.toUpperCase() },
                update: { value: stringValue },
                create: { key: key.toUpperCase(), value: stringValue }
            }));
        }
        await Promise.all(updates);
        return { success: true, message: 'Config updated' };
    }
    async getCoupons() {
        return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async createCoupon(data) {
        if (data.discountValue)
            data.discountValue = Number(data.discountValue);
        if (data.minOrderAmount)
            data.minOrderAmount = Number(data.minOrderAmount);
        if (data.maxDiscount)
            data.maxDiscount = Number(data.maxDiscount);
        if (data.usageLimit)
            data.usageLimit = Number(data.usageLimit);
        if (typeof data.validFrom === 'string')
            data.validFrom = new Date(data.validFrom);
        if (typeof data.validUntil === 'string')
            data.validUntil = new Date(data.validUntil);
        return this.prisma.coupon.create({ data });
    }
    async updateCoupon(id, data) {
        if (data.discountValue)
            data.discountValue = Number(data.discountValue);
        if (data.minOrderAmount)
            data.minOrderAmount = Number(data.minOrderAmount);
        if (data.maxDiscount)
            data.maxDiscount = Number(data.maxDiscount);
        if (data.usageLimit)
            data.usageLimit = Number(data.usageLimit);
        if (typeof data.validFrom === 'string')
            data.validFrom = new Date(data.validFrom);
        if (typeof data.validUntil === 'string')
            data.validUntil = new Date(data.validUntil);
        return this.prisma.coupon.update({ where: { id }, data });
    }
    async deleteCoupon(id) {
        return this.prisma.coupon.delete({ where: { id } });
    }
    async getAllCoinTransactions(limit = 20) {
        return this.prisma.coinLedger.findMany({
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
        });
    }
    async getCoinStats() {
        const totalIssued = await this.prisma.user.aggregate({ _sum: { coinsBalance: true } });
        const liability = (totalIssued._sum.coinsBalance || 0) * 1;
        return {
            circulation: totalIssued._sum.coinsBalance || 0,
            liability
        };
    }
    async getPendingReviews() {
        return this.prisma.review.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true } }, product: { select: { title: true } } }
        });
    }
    async deleteReview(id) {
        return this.prisma.review.delete({ where: { id } });
    }
    async getReports(status = 'PENDING') {
        return this.prisma.report.findMany({
            where: { status },
            include: { reporter: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }
    async resolveReport(id, action) {
        return this.prisma.report.update({
            where: { id },
            data: { status: action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED' }
        });
    }
    async getCategoryById(id) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category)
            throw new common_1.NotFoundException('Category not found');
        return category;
    }
    async updateCategory(id, data) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category)
            throw new common_1.NotFoundException('Category not found');
        return this.prisma.category.update({
            where: { id },
            data: {
                name: data.name,
                parentId: data.parentId === "" ? null : data.parentId,
                image: data.image,
                attributeSchema: data.attributeSchema
            }
        });
    }
    async getSystemHealth() {
        const start = Date.now();
        let dbStatus = 'UNKNOWN';
        let dbLatency = 0;
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            dbStatus = 'UP';
            dbLatency = Date.now() - start;
        }
        catch (e) {
            dbStatus = 'DOWN';
            console.error('Health Check Failed:', e);
        }
        const memoryUsage = process.memoryUsage();
        return {
            status: dbStatus === 'UP' ? 'HEALTHY' : 'UNHEALTHY',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                status: dbStatus,
                latency: `${dbLatency}ms`
            },
            system: {
                memoryMsg: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                platform: process.platform,
                nodeVersion: process.version
            }
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map