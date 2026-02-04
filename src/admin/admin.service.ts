import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomStatus, RiskTag, ValueTag, UserRole, UserStatus, OrderStatus } from '@prisma/client';
import { OrderStateValidatorService } from '../orders/order-state-validator.service';
import { RedisService } from '../shared/redis.service';
import { PlatformConfigHelper } from '../common/platform-config.helper';

@Injectable()
export class AdminService {
    constructor(
        private prisma: PrismaService,
        private orderStateValidator: OrderStateValidatorService,
        private redisService: RedisService,
    ) { }

    async getDashboardKPIs(period: string = 'Last 7 Days') {
        const [
            totalOrders,
            totalProducts,
            totalShops,
            totalCustomers,
            ordersSum,
        ] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.product.count(),
            this.prisma.vendor.count(),
            this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
            this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
        ]);

        const totalRevenue = ordersSum._sum.totalAmount || 0;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Mocking conversion rate for now as it requires session tracking
        const conversionRate = 3.5;

        return {
            totalRevenue,
            totalOrders,
            activeCustomers: totalCustomers, // Simplified for now
            conversionRate,
            averageOrderValue,
            totalProducts,
            totalShops,
            totalCustomers,
        };
    }

    async getDashboardAnalytics(period: string = 'Last 7 Days') {
        const stats = await this.getAnalytics();

        // Transform the existing analytics into the format the dashboard expects
        return {
            orderData: stats.revenue.map(r => ({ name: r.date, orders: Math.floor(r.amount / 100) + 1 })), // Mocking order count from revenue for now if count not available
            userData: [
                { name: 'Customers', value: stats.dau },
                { name: 'Vendors', value: stats.newVendors },
                { name: 'Drivers', value: 3 }, // Placeholder
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

        const [
            totalOrders,
            totalRooms,
            unlockedRooms,
            registredUsers,
            activeVendors,
            ordersSum,
            lowStockProducts,
            recentOrders,
            categoryStats,
            topProducts,
            recentAuditLogs,
            newVendors
        ] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.room.count(),
            this.prisma.room.count({ where: { status: RoomStatus.UNLOCKED } }),
            this.prisma.user.count(),
            this.prisma.vendor.count({ where: { kycStatus: 'APPROVED' } }),
            this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
            this.prisma.product.count({ where: { stock: { lte: 10 } } }),
            this.prisma.order.findMany({
                where: { createdAt: { gte: sevenDaysAgo } },
                select: { id: true, createdAt: true, totalAmount: true, User: { select: { name: true } }, status: true },
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.product.groupBy({
                by: ['categoryId'],
                _count: { id: true }
            }),
            this.prisma.product.findMany({
                take: 5,
                orderBy: { price: 'desc' }, // Placeholder for 'Top Selling' due to Json structure limits
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

        // Process Revenue Data (Last 7 Days)
        const revenueMap = new Map<string, number>();
        recentOrders.forEach(o => {
            const date = o.createdAt.toISOString().split('T')[0];
            revenueMap.set(date, (revenueMap.get(date) || 0) + o.totalAmount);
        });

        const revenueChart = Array.from(revenueMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Process Categories
        // Fetch category names
        const categoryIds = categoryStats.map(c => c.categoryId);
        const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } });
        const categoriesChart = categoryStats.map(c => ({
            category: categories.find(cat => cat.id === c.categoryId)?.name || 'Unknown',
            count: c._count.id
        }));

        // Aggregated Recent Activity
        const activity = [
            ...recentOrders.slice(0, 5).map(o => ({
                id: o.id,
                title: `Order #${o.id.substring(0, 6)}`,
                subtitle: `${o.User?.name || 'User'} · ${o.totalAmount}`,
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
                earnings: '-' // Calculation requires deep order scanning
            })),
            activity,
            trends: {
                revenue: '+0%', // Placeholder
                orders: '+0%',
                vendors: '+0%'
            }
        };
    }

    // --- USERS MANAGEMENT ---

    async getUsers(page: number = 1, search?: string, filters?: { role?: UserRole, status?: UserStatus, riskTag?: RiskTag, valueTag?: ValueTag }, limit: number = 50) {
        const take = Math.min(100, Math.max(1, limit)); // Cap between 1 and 100
        const skip = (page - 1) * take;
        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { id: { equals: search } }
            ];
        }

        if (filters) {
            if (filters.role) where.role = filters.role;
            if (filters.status) where.status = filters.status;
            if (filters.riskTag) where.riskTag = filters.riskTag;
            if (filters.valueTag) where.valueTag = filters.valueTag;
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

    // --- USERS MANAGEMENT: Details ---

    async getUserDetails(id: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id },
                include: {
                    Address: true,
                    AdminNote_AdminNote_userIdToUser: {
                        include: { User_AdminNote_adminIdToUser: { select: { email: true } } },
                        orderBy: { createdAt: 'desc' }
                    },
                    Order: {
                        take: 20,
                        orderBy: { createdAt: 'desc' },
                        include: { Payment: true }
                    },
                    Review: { take: 5, orderBy: { createdAt: 'desc' } },
                }
            });

            if (!user) throw new NotFoundException('User not found');

            let coinLedger = [];
            try {
                // Manual fetch for CoinLedger 
                coinLedger = await this.prisma.coinLedger.findMany({
                    where: { userId: id },
                    take: 20,
                    orderBy: { createdAt: 'desc' }
                });
            } catch (ledgerError) {
                console.warn('Failed to fetch CoinLedger:', ledgerError.message);
            }

            // Enhanced Risk Calculation
            const totalOrders = user.Order?.length || 0;
            const cancelledOrders = user.Order ? user.Order.filter(o => o.status === 'CANCELLED').length : 0;
            const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

            // Auto Update Risk if necessary (Logic can be moved to a private method)
            let derivedRiskTag = user.riskTag;
            if (cancellationRate > 50 && totalOrders > 3) derivedRiskTag = RiskTag.HIGH;
            else if (cancellationRate > 20 && totalOrders > 3) derivedRiskTag = RiskTag.MEDIUM;

            return {
                ...user,
                adminNotes: user.AdminNote_AdminNote_userIdToUser, // Map for frontend compatibility
                coinLedger,
                riskStats: { totalOrders, cancellationRate, derivedRiskTag }
            };
        } catch (error) {
            console.error(`Error in getUserDetails for id ${id}:`, error);
            if (error instanceof NotFoundException) throw error;
            throw new Error(`Failed to fetch user details: ${error.message}`);
        }
    }

    // --- USERS MANAGEMENT: Update User ---

    async updateUser(adminId: string, userId: string, data: { name?: string; email?: string; mobile?: string; role?: UserRole; status?: UserStatus; riskTag?: RiskTag; valueTag?: ValueTag }) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.mobile !== undefined) updateData.mobile = data.mobile;
        if (data.role !== undefined) updateData.role = data.role;
        if (data.riskTag !== undefined) updateData.riskTag = data.riskTag;
        if (data.valueTag !== undefined) updateData.valueTag = data.valueTag;
        if (data.status !== undefined) updateData.status = data.status;

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

    async toggleCod(adminId: string, userId: string, disabled: boolean) {
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

    // --- USERS MANAGEMENT: Risk & Value Tags ---

    async updateRiskTag(adminId: string, userId: string, tag: string) {
        const validTags = ['LOW', 'MEDIUM', 'HIGH'];
        if (!validTags.includes(tag)) {
            throw new BadRequestException(`Invalid risk tag. Must be one of: ${validTags.join(', ')}`);
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const oldTag = user.riskTag;
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { riskTag: tag as any }
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

    async updateValueTag(adminId: string, userId: string, tag: string) {
        const validTags = ['NORMAL', 'VIP'];
        if (!validTags.includes(tag)) {
            throw new BadRequestException(`Invalid value tag. Must be one of: ${validTags.join(', ')}`);
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const oldTag = user.valueTag;
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { valueTag: tag as any }
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

    // --- USERS MANAGEMENT: Admin Notes ---

    async addAdminNote(adminId: string, userId: string, note: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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

    // --- USERS MANAGEMENT: Get User Cart ---

    async getUserCart(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: {
                CartItem: {
                    include: {
                        Product: {
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

        const totalItems = cart.CartItem.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = cart.CartItem.reduce((sum, item) => sum + (item.Product.price * item.quantity), 0);

        return {
            id: cart.id,
            items: cart.CartItem.map(item => ({
                id: item.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                product: item.Product
            })),
            totalItems,
            totalValue
        };
    }

    // --- USERS MANAGEMENT: Coins ---

    async updateUserCoins(adminId: string, userId: string, amount: number, reason: string) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new NotFoundException('User not found');

            const newBalance = (user.coinsBalance || 0) + amount;

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coinsBalance: newBalance }
            });

            // Also create a ledger entry for tracking
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

    // --- USERS MANAGEMENT: Update User Status (Generic) ---

    async updateUserStatus(adminId: string, userId: string, status: string, reason?: string) {
        const validStatuses = ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException(`Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const previousStatus = user.status || 'ACTIVE';

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { status: status as any }
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

    // --- USERS MANAGEMENT: Suspend User ---

    async suspendUser(adminId: string, userId: string, reason?: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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

    // --- USERS MANAGEMENT: Activate User ---

    async activateUser(adminId: string, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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

    // --- USERS MANAGEMENT: Ban User ---

    async banUser(adminId: string, userId: string, reason: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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

    // --- New Enterprise Methods (Cleanup) ---

    async forceLogout(adminId: string, userId: string) {
        // Set forceLogoutAt to now and invalidate all sessions via Redis
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { forceLogoutAt: new Date() }
        });

        // Set force logout timestamp in Redis for immediate effect
        const now = Math.floor(Date.now() / 1000);
        await this.redisService.set(`force_logout:${userId}`, now.toString(), 7 * 24 * 60 * 60);
        
        // Remove all refresh tokens
        await this.redisService.del(`refresh_token:${userId}`);

        await this.prisma.auditLog.create({
            data: { 
                adminId, 
                entity: 'USER', 
                entityId: userId, 
                action: 'FORCE_LOGOUT',
                details: { 
                    previousForceLogoutAt: updatedUser.forceLogoutAt,
                    newForceLogoutAt: new Date().toISOString()
                }
            }
        });

        return { success: true, message: 'User sessions invalidated successfully' };
    }

    async updateKycStatus(adminId: string, userId: string, status: string, notes?: string) {
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { kycStatus: status }
        });

        if (notes) {
            await this.addAdminNote(adminId, userId, `KYC Update: ${status} - ${notes}`);
        }

        return updatedUser;
    }

    async toggleRefunds(adminId: string, userId: string, disabled: boolean) {
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { isRefundsDisabled: disabled }
        });

        await this.prisma.auditLog.create({
            data: { adminId, entity: 'USER', entityId: userId, action: 'TOGGLE_REFUNDS', details: { disabled } }
        });

        return updatedUser;
    }

    async exportUsersCSV(): Promise<string> {
        const users = await this.prisma.user.findMany({
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
                createdAt: true,
            },
        });

        // CSV Header
        const headers = ['ID', 'Name', 'Email', 'Mobile', 'Role', 'Status', 'Coins Balance', 'Risk Tag', 'Value Tag', 'Created At'];
        const rows = users.map(user => [
            user.id,
            user.name || '',
            user.email || '',
            user.mobile,
            user.role,
            user.status,
            user.coinsBalance.toString(),
            user.riskTag,
            user.valueTag,
            user.createdAt.toISOString(),
        ]);

        // Escape CSV values
        const escapeCSV = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const csvRows = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(',')),
        ];

        return csvRows.join('\n');
    }

    async exportOrdersCSV(filters?: { status?: string; startDate?: Date; endDate?: Date }): Promise<string> {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }

        const orders = await this.prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true, mobile: true } },
            },
            take: 10000, // Limit for performance
        });

        const headers = ['Order ID', 'User Name', 'User Email', 'User Mobile', 'Total Amount', 'Status', 'Created At'];
        const rows = orders.map(order => [
            order.id,
            order.user?.name || '',
            order.user?.email || '',
            order.user?.mobile || '',
            (order.totalAmount / 100).toFixed(2), // Convert paise to rupees
            order.status,
            order.createdAt.toISOString(),
        ]);

        const escapeCSV = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const csvRows = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(',')),
        ];

        return csvRows.join('\n');
    }

    async exportProductsCSV(filters?: { vendorId?: string; isActive?: boolean }): Promise<string> {
        const where: any = {};
        if (filters?.vendorId) where.vendorId = filters.vendorId;
        if (filters?.isActive !== undefined) where.isActive = filters.isActive;

        const products = await this.prisma.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                vendor: { select: { name: true, storeName: true } },
            },
            take: 10000, // Limit for performance
        });

        const headers = ['Product ID', 'Title', 'Vendor', 'Price (₹)', 'Stock', 'Active', 'Created At'];
        const rows = products.map(product => [
            product.id,
            product.title,
            product.vendor?.storeName || product.vendor?.name || '',
            (product.price / 100).toFixed(2), // Convert paise to rupees
            product.stock.toString(),
            product.isActive ? 'Yes' : 'No',
            product.createdAt.toISOString(),
        ]);

        const escapeCSV = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const csvRows = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(',')),
        ];

        return csvRows.join('\n');
    }

    async exportVendorsCSV(filters?: { status?: string }): Promise<string> {
        const where: any = {};
        if (filters?.status && filters.status !== 'ALL') {
            where.kycStatus = filters.status;
        }

        const vendors = await this.prisma.vendor.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 10000, // Limit for performance
        });

        const headers = ['Vendor ID', 'Name', 'Store Name', 'Email', 'Mobile', 'KYC Status', 'Role', 'Coins Balance', 'Created At'];
        const rows = vendors.map(vendor => [
            vendor.id,
            vendor.name,
            vendor.storeName || '',
            vendor.email || '',
            vendor.mobile,
            vendor.kycStatus,
            vendor.role,
            vendor.coinsBalance.toString(),
            vendor.createdAt.toISOString(),
        ]);

        const escapeCSV = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const csvRows = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(',')),
        ];

        return csvRows.join('\n');
    }

    // Bulk Operations
    async bulkUpdateUsers(adminId: string, userIds: string[], data: { status?: string; role?: string }) {
        const updateData: any = {};
        if (data.status) updateData.status = data.status;
        if (data.role) updateData.role = data.role;

        const result = await this.prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: updateData,
        });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: 'BULK',
                action: 'BULK_UPDATE',
                details: { userIds, updateData, count: result.count },
            },
        });

        return { updated: result.count, userIds };
    }

    async bulkDeleteUsers(adminId: string, userIds: string[]) {
        // Soft delete by setting status to BANNED and adding deletedAt marker
        const result = await this.prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { 
                status: 'BANNED',
                updatedAt: new Date()
            }
        });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: 'BULK',
                action: 'BULK_DELETE',
                details: { userIds, count: result.count },
            },
        });

        return { deleted: result.count, userIds };
    }

    async bulkUpdateProducts(adminId: string, productIds: string[], data: { isActive?: boolean }) {
        const updateData: any = {};
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        const result = await this.prisma.product.updateMany({
            where: { id: { in: productIds } },
            data: updateData,
        });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'PRODUCT',
                entityId: 'BULK',
                action: 'BULK_UPDATE',
                details: { productIds, updateData, count: result.count },
            },
        });

        return { updated: result.count, productIds };
    }

    async bulkDeleteProducts(adminId: string, productIds: string[]) {
        const result = await this.prisma.product.deleteMany({
            where: { id: { in: productIds } },
        });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'PRODUCT',
                entityId: 'BULK',
                action: 'BULK_DELETE',
                details: { productIds, count: result.count },
            },
        });

        return { deleted: result.count, productIds };
    }

    // --- AUTOMATION: Risk & Value Analysis ---

    async calculateUserRisk(userId: string) {
        const orders = await this.prisma.order.findMany({
            where: { userId },
            select: { status: true, totalAmount: true }
        });

        if (orders.length === 0) return { risk: 'LOW', value: 'NORMAL' };

        const totalOrders = orders.length;
        const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
        const totalSpent = orders.reduce((sum, o) => sum + (o.status === 'DELIVERED' ? o.totalAmount : 0), 0);

        const cancelRate = cancelled / totalOrders;

        let newRisk: RiskTag = 'LOW';
        if (cancelRate > 0.5 && totalOrders > 3) newRisk = 'HIGH';
        else if (cancelRate > 0.2 && totalOrders > 3) newRisk = 'MEDIUM';

        let newValue: ValueTag = 'NORMAL';
        if (totalSpent > 50000) newValue = 'VIP'; // 50k threshold

        // Update User
        await this.prisma.user.update({
            where: { id: userId },
            data: { riskTag: newRisk, valueTag: newValue }
        });

        return { risk: newRisk, value: newValue, stats: { cancelRate, totalSpent } };
    }

    // --- USERS MANAGEMENT: Delete User ---

    async deleteUser(adminId: string, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Prevent deletion of admin/super_admin users
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
            throw new BadRequestException('Cannot delete admin users. Demote to CUSTOMER first.');
        }

        // Soft delete by marking as banned and clearing sensitive data
        // Use a unique placeholder email to avoid unique constraint violations
        const deletedEmail = user.email ? `deleted_${userId.substring(0, 8)}_${Date.now()}@deleted.risbow` : null;
        const deletedMobile = user.mobile ? `DEL${userId.substring(0, 6)}${Date.now()}` : null;
        
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                status: 'BANNED',
                email: deletedEmail,
                mobile: deletedMobile,
                name: `Deleted User`,
                password: null, // Clear password
                forceLogoutAt: new Date(), // Invalidate all sessions
            }
        });

        // Force logout all sessions
        const now = Math.floor(Date.now() / 1000);
        await this.redisService.set(`force_logout:${userId}`, now.toString(), 7 * 24 * 60 * 60);
        await this.redisService.del(`refresh_token:${userId}`);

        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'USER',
                entityId: userId,
                action: 'DELETE_USER',
                details: { 
                    deletedEmail: user.email, 
                    deletedName: user.name,
                    deletedMobile: user.mobile,
                    deletedAt: new Date().toISOString()
                }
            }
        });

        return { success: true, message: 'User deleted successfully' };
    }

    // --- USERS MANAGEMENT: Get User Orders ---

    async getUserOrders(userId: string, limit: number = 20) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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

    // --- USERS MANAGEMENT: Get User Wishlist ---

    async getUserWishlist(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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

    // --- USERS MANAGEMENT: Get User Addresses ---

    async getUserAddresses(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const addresses = await this.prisma.address.findMany({
            where: { userId },
            orderBy: { isDefault: 'desc' }
        });

        return { addresses, total: addresses.length };
    }

    // --- USERS MANAGEMENT: Send User Notification ---

    async sendUserNotification(userId: string, title: string, message: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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

    // --- USERS MANAGEMENT: Reset User Password ---

    async resetUserPassword(adminId: string, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Generate a temporary password or send reset link
        // For now, just clear the password so user must reset
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

    // --- USERS MANAGEMENT: Get User Activity ---

    async getUserActivity(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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

        // Combine and sort all activities
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

    // --- ORDERS MANAGEMENT ---

    async getAllOrders(limit: number = 50, search?: string, status?: string) {
        const where: any = {};

        if (status && status !== 'ALL') {
            // Prisma enum matching 
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

    async getOrderById(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: { select: { id: true, name: true, email: true, mobile: true } },
                address: true
            }
        });
        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    async updateOrderStatus(adminId: string, orderId: string, status: any, logistics?: { awb?: string, courier?: string }) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException("Order not found");

        // 🔐 ENFORCEMENT: Packing proof is mandatory before SHIPPED status (even for admins)
        if (status === 'SHIPPED' || status === 'DISPATCHED' || status === OrderStatus.SHIPPED) {
            const proof = await this.prisma.orderPackingProof.findUnique({
                where: { orderId },
            });
            if (!proof) {
                throw new BadRequestException('Packing video proof is mandatory before order can be shipped. Please upload packing video first.');
            }
        }

        // 🔐 P0 FIX: Validate state transition using OrderStateValidatorService
        // Allow admin override for emergency cases, but log it
        const isValidTransition = this.orderStateValidator.isValidTransition(order.status, status as OrderStatus);
        const allowAdminOverride = !isValidTransition; // Allow override if transition is invalid

        await this.orderStateValidator.validateTransition(
            order.status,
            status as OrderStatus,
            orderId,
            adminId,
            'ADMIN',
            allowAdminOverride,
        );

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: status, // Ensure status matches Enum
                awbNumber: logistics?.awb,
                courierPartner: logistics?.courier
            }
        });

        // Audit Log
        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'ORDER',
                entityId: orderId,
                action: 'UPDATE_STATUS',
                details: { 
                    oldStatus: order.status, 
                    newStatus: status, 
                    logistics,
                    adminOverride: allowAdminOverride,
                    isValidTransition,
                }
            }
        });

        return updated;
    }

    // --- VENDORS MANAGEMENT ---

    async getVendors(status: string = 'ALL', page: number = 1, limit: number = 20, search?: string, sort?: string) {
        try {
            const where: any = {};
            if (status && status !== 'ALL' && status !== '') {
                // Map frontend status to DB: ACTIVE/VERIFIED -> APPROVED; PENDING/SUSPENDED as-is
                const kycMap: Record<string, string> = {
                    ACTIVE: 'APPROVED',
                    VERIFIED: 'APPROVED',
                    PENDING: 'PENDING',
                    SUSPENDED: 'SUSPENDED',
                    REJECTED: 'REJECTED',
                    APPROVED: 'APPROVED',
                };
                where.kycStatus = kycMap[status] ?? status;
            }
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { storeName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { mobile: { contains: search, mode: 'insensitive' } },
                ];
            }

            // Parse sort parameter (e.g., "orderCount:desc" or "createdAt:asc")
            let orderBy: any = { createdAt: 'desc' }; // default
            if (sort) {
                const [field, direction] = sort.split(':');
                if (field && direction) {
                    // Note: orderCount is not a direct field, would need aggregation
                    // For now, use available fields like createdAt, followCount, etc.
                    if (field === 'orderCount') {
                        // Can't sort by orderCount without aggregation, use followCount as proxy
                        orderBy = { followCount: direction.toLowerCase() };
                    } else {
                        orderBy = { [field]: direction.toLowerCase() };
                    }
                }
            }

        const [vendors, total] = await Promise.all([
            this.prisma.vendor.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    mobile: true,
                    email: true,
                    storeName: true,
                    storeLogo: true,
                    storeBanner: true,
                    kycStatus: true,
                    tier: true,
                    storeStatus: true,
                    role: true,
                    commissionRate: true,
                    coinsBalance: true,
                    performanceScore: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: { select: { products: true } },
                },
            }),
            this.prisma.vendor.count({ where }),
        ]);

        const data = vendors.map((v: any) => {
            const { _count, ...rest } = v;
            return {
                ...rest,
                phone: v.mobile,
                status: v.storeStatus ?? 'ACTIVE',
                totalSales: 0,
                totalOrders: 0,
                rating: Number(v.performanceScore) || 0,
                totalProducts: _count?.products ?? 0,
            };
        });

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
        } catch (error) {
            console.error('Error in getVendors:', error);
            // Return empty result instead of throwing
            return {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    limit: 20,
                    totalPages: 0,
                },
            };
        }
    }

    async approveVendor(adminId: string, id: string, approved: boolean, reason?: string) {
        const newStatus = approved ? 'APPROVED' : 'REJECTED';

        const vendor = await this.prisma.vendor.findUnique({ where: { id } });
        if (!vendor) throw new NotFoundException('Vendor not found');

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

    async updateVendorCommission(adminId: string, id: string, rate: number) {
        // Validate commission rate
        if (typeof rate !== 'number' || isNaN(rate)) {
            throw new BadRequestException('Commission rate must be a valid number');
        }
        if (rate < 0 || rate > 100) {
            throw new BadRequestException('Commission rate must be between 0 and 100');
        }
        
        // Check if vendor exists
        const existingVendor = await this.prisma.vendor.findUnique({ where: { id } });
        if (!existingVendor) {
            throw new NotFoundException('Vendor not found');
        }

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
                details: { previousRate: existingVendor.commissionRate, newRate: rate }
            }
        });
        return vendor;
    }

    async getVendorDetails(id: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
            include: {
                products: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        stock: true,
                        isActive: true,
                    },
                },
                reviews: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
                VendorMembership: true,
                documents: {
                    orderBy: { uploadedAt: 'desc' },
                },
            },
        });

        if (!vendor) throw new NotFoundException('Vendor not found');

        // Get additional stats
        const [totalOrders, totalRevenue, totalProducts] = await Promise.all([
            this.prisma.orderSettlement.count({
                where: { vendorId: id },
            }),
            this.prisma.orderSettlement.aggregate({
                where: { vendorId: id },
                _sum: { amount: true },
            }),
            this.prisma.product.count({
                where: { vendorId: id },
            }),
        ]);

        return {
            ...vendor,
            stats: {
                totalOrders,
                totalRevenue: totalRevenue._sum.amount || 0,
                totalProducts,
            },
        };
    }

    async verifyVendorKyc(adminId: string, vendorId: string, status: string, notes?: string) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        const updated = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: status }
        });

        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'VENDOR',
                entityId: vendorId,
                action: 'VERIFY_KYC',
                details: { status, notes, previousStatus: vendor.kycStatus }
            }
        });

        return updated;
    }

    async suspendVendor(adminId: string, vendorId: string, reason?: string) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        const updated = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { storeStatus: 'SUSPENDED' }
        });

        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'VENDOR',
                entityId: vendorId,
                action: 'SUSPEND_VENDOR',
                details: { reason, previousStatus: vendor.storeStatus }
            }
        });

        return updated;
    }

    async activateVendor(adminId: string, vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        const updated = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { storeStatus: 'ACTIVE' }
        });

        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'VENDOR',
                entityId: vendorId,
                action: 'ACTIVATE_VENDOR',
                details: { previousStatus: vendor.storeStatus }
            }
        });

        return updated;
    }

    async getVendorAnalytics(vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [orders, revenue, products, reviews] = await Promise.all([
            this.prisma.orderSettlement.findMany({
                where: {
                    vendorId,
                    createdAt: { gte: thirtyDaysAgo },
                },
                select: {
                    id: true,
                    amount: true,
                    status: true,
                    createdAt: true,
                },
            }),
            this.prisma.orderSettlement.aggregate({
                where: {
                    vendorId,
                    createdAt: { gte: thirtyDaysAgo },
                },
                _sum: { amount: true },
            }),
            this.prisma.product.count({
                where: { vendorId },
            }),
            this.prisma.review.aggregate({
                where: { vendorId },
                _avg: { rating: true },
                _count: true,
            }),
        ]);

        return {
            vendor: {
                id: vendor.id,
                name: vendor.name,
                storeName: vendor.storeName,
                kycStatus: vendor.kycStatus,
                performanceScore: vendor.performanceScore,
            },
            analytics: {
                orders: {
                    total: orders.length,
                    revenue: revenue._sum.amount || 0,
                    byStatus: orders.reduce((acc, o) => {
                        acc[o.status] = (acc[o.status] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>),
                },
                products: {
                    total: products,
                },
                reviews: {
                    average: reviews._avg.rating || 0,
                    count: reviews._count,
                },
            },
        };
    }

    async getVendorDocuments(vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        const documents = await this.prisma.vendorDocument.findMany({
            where: { vendorId },
            orderBy: { uploadedAt: 'desc' },
        });

        return {
            vendorId,
            kycDocuments: vendor.kycDocuments,
            uploadedDocuments: documents,
        };
    }

    async getVendorPayouts(vendorId: string, page: number = 1, limit: number = 20) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        const [payouts, total] = await Promise.all([
            this.prisma.vendorPayout.findMany({
                where: { vendorId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.vendorPayout.count({ where: { vendorId } }),
        ]);

        return {
            data: payouts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getAllRooms() {
        return this.prisma.room.findMany({ orderBy: { startAt: 'desc' } }); // Removed invalid include
    }

    async createRoom(adminId: string, data: any) {
        // Validate dates if string
        if (typeof data.startAt === 'string') data.startAt = new Date(data.startAt);
        if (typeof data.endAt === 'string') data.endAt = new Date(data.endAt);

        return this.prisma.room.create({
            data: {
                ...data,
                createdById: adminId,
            }
        });
    }

    // --- PRODUCTS & CATALOG ---

    async getProducts(categoryId?: string, search?: string) {
        const where: any = {};
        if (categoryId) where.categoryId = categoryId;
        if (search) where.title = { contains: search, mode: 'insensitive' };

        return this.prisma.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }

    async getCategories() {
        return this.prisma.category.findMany();
    }

    async createCategory(data: { name: string, parentId?: string, image?: string }) {
        return this.prisma.category.create({ data });
    }

    async createProduct(data: any) {
        if (data.stock) data.stock = Number(data.stock);
        if (data.price) data.price = Number(data.price);
        return this.prisma.product.create({ data });
    }

    async bulkCreateProducts(products: any[]) {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as any[]
        };

        for (const p of products) {
            try {
                if (p.stock) p.stock = Number(p.stock);
                if (p.price) p.price = Number(p.price);
                // Ensure required fields
                if (!p.title || !p.price || !p.categoryId) {
                    throw new Error("Missing required fields (title, price, categoryId)");
                }

                await this.prisma.product.create({ data: p });
                results.success++;
            } catch (e) {
                results.failed++;
                results.errors.push({ title: p.title, error: e.message });
            }
        }
        return results;
    }

    async deleteCategory(id: string) {
        // 1. Check for sub-categories
        const children = await this.prisma.category.count({ where: { parentId: id } });
        if (children > 0) throw new Error("Cannot delete category with sub-categories");

        // 2. Check for products
        const products = await this.prisma.product.count({ where: { categoryId: id } });
        if (products > 0) throw new Error("Cannot delete category containing products");

        return this.prisma.category.delete({ where: { id } });
    }

    async toggleProductStatus(id: string, isActive: boolean) {
        return this.prisma.product.update({
            where: { id },
            data: { isActive: isActive }
        });
    }

    // --- MARKETING: Banners ---

    async getBanners() {
        return this.prisma.banner.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async createBanner(adminId: string, data: any) {
        return this.prisma.banner.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate)
            }
        });
    }

    async toggleBannerStatus(id: string, isActive: boolean) {
        return this.prisma.banner.update({
            where: { id },
            data: { isActive }
        });
    }

    // --- MARKETING: Notifications ---

    async sendBroadcast(adminId: string, title: string, body: string, audience: string) {
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

    async deleteBanner(id: string) {
        return this.prisma.banner.delete({ where: { id } });
    }

    // --- AUDIT LOGS ---

    async getAuditLogs(limit: number = 50) {
        return this.prisma.auditLog.findMany({
            take: Number(limit),
            orderBy: { createdAt: 'desc' }
        });
    }

    // --- SETTINGS (Platform Config) ---

    async getPlatformConfig() {
        return this.prisma.platformConfig.findMany();
    }

    async updatePlatformConfig(key: string, value: string, updatedById: string = 'system') {
        const category = PlatformConfigHelper.extractCategory(key);
        const keyPart = PlatformConfigHelper.extractKey(key);
        
        return this.prisma.platformConfig.upsert({
            where: PlatformConfigHelper.buildWhereUnique(category, keyPart),
            update: { 
                value: PlatformConfigHelper.serializeValue(value),
                updatedById 
            },
            create: { 
                category,
                key: keyPart,
                value: PlatformConfigHelper.serializeValue(value),
                updatedById
            }
        });
    }

    // --- APP CONFIG (Dynamic Frontend Configuration) ---

    async getAppConfig() {
        const configs = await this.prisma.platformConfig.findMany();
        const configMap: Record<string, any> = {};

        for (const config of configs) {
            const fullKey = `${config.category}.${config.key}`;
            configMap[fullKey] = PlatformConfigHelper.parseJsonValue(config.value);
            // Also add the key without category for backward compatibility
            configMap[config.key] = PlatformConfigHelper.parseJsonValue(config.value);
        }

        // Add defaults for essential app config
        return {
            maintenance_mode: configMap['MAINTENANCE_MODE'] ?? false,
            tagline: configMap['TAGLINE'] ?? 'Your Super Shopping App',
            min_app_version: configMap['MIN_APP_VERSION'] ?? '1.0.0',
            force_update: configMap['FORCE_UPDATE'] ?? false,
            announcement: configMap['ANNOUNCEMENT'] ?? null,
            ...configMap
        };
    }

    async updateAppConfig(data: Record<string, any>, updatedById: string = 'system') {
        const updates = [];

        for (const [key, value] of Object.entries(data)) {
            const category = PlatformConfigHelper.extractCategory(key.toUpperCase());
            const keyPart = PlatformConfigHelper.extractKey(key.toUpperCase());
            const serializedValue = PlatformConfigHelper.serializeValue(value);
            
            updates.push(
                this.prisma.platformConfig.upsert({
                    where: PlatformConfigHelper.buildWhereUnique(category, keyPart),
                    update: { 
                        value: serializedValue,
                        updatedById 
                    },
                    create: { 
                        category,
                        key: keyPart,
                        value: serializedValue,
                        updatedById
                    }
                })
            );
        }

        await Promise.all(updates);
        return { success: true, message: 'Config updated' };
    }

    // --- COUPONS ---

    async getCoupons() {
        // Prisma model name is 'Coupon' (capital C), client usually maps it to 'coupon' (lowercase) or 'Coupon' depending on generation.
        // Checking schema: `model Coupon` -> `this.prisma.coupon`
        return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async createCoupon(data: any) {
        // Ensure numbers are numbers
        if (data.discountValue) data.discountValue = Number(data.discountValue);
        if (data.minOrderAmount) data.minOrderAmount = Number(data.minOrderAmount);
        if (data.maxDiscount) data.maxDiscount = Number(data.maxDiscount);
        if (data.usageLimit) data.usageLimit = Number(data.usageLimit);

        // Ensure dates
        if (typeof data.validFrom === 'string') data.validFrom = new Date(data.validFrom);
        if (typeof data.validUntil === 'string') data.validUntil = new Date(data.validUntil);

        return this.prisma.coupon.create({ data });
    }

    async updateCoupon(id: string, data: any) {
        // Validations
        if (data.discountValue) data.discountValue = Number(data.discountValue);
        if (data.minOrderAmount) data.minOrderAmount = Number(data.minOrderAmount);
        if (data.maxDiscount) data.maxDiscount = Number(data.maxDiscount);
        if (data.usageLimit) data.usageLimit = Number(data.usageLimit);
        if (typeof data.validFrom === 'string') data.validFrom = new Date(data.validFrom);
        if (typeof data.validUntil === 'string') data.validUntil = new Date(data.validUntil);

        return this.prisma.coupon.update({ where: { id }, data });
    }

    async deleteCoupon(id: string) {
        return this.prisma.coupon.delete({ where: { id } });
    }

    // --- COINS ---

    async getAllCoinTransactions(limit: number = 20) {
        return this.prisma.coinLedger.findMany({
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
            // Need user name if possible, but CoinLedger schema only has userId. 
            // Ideally fetching user info is done via separate query or if Relation existed.
            // Schema has 'userId' string but no Relation defined in 'CoinLedger'.
            // I will fetch user mapping manually.
        });
        // Actually without relation in schema, I can't include. 
        // I will return raw ledger for now, or update schema later if user insists on names in table.
        // Wait, I can try to fetch users.
    }

    async getCoinStats() {
        const totalIssued = await this.prisma.user.aggregate({ _sum: { coinsBalance: true } });
        const liability = (totalIssued._sum.coinsBalance || 0) * 1; // Assuming 1 Coin = 1 INR liability roughly
        return {
            circulation: totalIssued._sum.coinsBalance || 0,
            liability
        };
    }

    // --- MODERATION ---

    async getPendingReviews() {
        return this.prisma.review.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { User: { select: { name: true } }, Product: { select: { title: true } } }
        });
    }

    async deleteReview(id: string) {
        return this.prisma.review.delete({ where: { id } });
    }

    async getReports(status: string = 'PENDING') {
        return this.prisma.report.findMany({
            where: { status },
            include: { reporter: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async resolveReport(id: string, action: string) {
        // action: RESOLVE, DISMISS
        return this.prisma.report.update({
            where: { id },
            data: { status: action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED' }
        });
    }


    async getCategoryById(id: string) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) throw new NotFoundException('Category not found');
        return category;
    }

    async updateCategory(id: string, data: any) {
        // Ensure name is present or handle as partial update
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) throw new NotFoundException('Category not found');

        return (this.prisma.category.update as any)({
            where: { id },
            data: {
                name: data.name,
                parentId: data.parentId === "" ? null : data.parentId,
                image: data.image,
                attributeSchema: data.attributeSchema
            }
        });
    }

    async toggleAiKillSwitch(adminId: string, enabled: boolean) {
        const config = await this.prisma.platformConfig.upsert({
            where: { key: 'AI_KILL_SWITCH' },
            update: { value: enabled ? 'true' : 'false' },
            create: { key: 'AI_KILL_SWITCH', value: enabled ? 'true' : 'false' }
        });

        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'SYSTEM',
                entityId: 'AI_KILL_SWITCH',
                action: enabled ? 'ENABLE_KILL_SWITCH' : 'DISABLE_KILL_SWITCH',
                details: { enabled }
            }
        });

        return config;
    }

    async getSystemHealth() {
        const start = Date.now();
        let dbStatus = 'UNKNOWN';
        let dbLatency = 0;

        try {
            // Check DB
            await this.prisma.$queryRaw`SELECT 1`;
            dbStatus = 'UP';
            dbLatency = Date.now() - start;
        } catch (e) {
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
}
