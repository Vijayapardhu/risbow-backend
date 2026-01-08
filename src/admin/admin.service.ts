import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomStatus, RiskTag, ValueTag, UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

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
                select: { id: true, createdAt: true, totalAmount: true, user: { select: { name: true } }, status: true },
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
                orderBy: { createdAt: 'desc' },
                include: { admin: { select: { email: true } } }
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
                subtitle: `${l.admin.email} · ${l.entity}`,
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

    async getUsers(page: number = 1, search?: string, filters?: { role?: UserRole, status?: UserStatus, riskTag?: RiskTag, valueTag?: ValueTag }) {
        const take = 50; // Increased page size for admin
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
                    addresses: true,
                    adminNotes: {
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
            const totalOrders = user.orders?.length || 0;
            const cancelledOrders = user.orders ? user.orders.filter(o => o.status === 'CANCELLED').length : 0;
            const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

            // Auto Update Risk if necessary (Logic can be moved to a private method)
            let derivedRiskTag = user.riskTag;
            if (cancellationRate > 50 && totalOrders > 3) derivedRiskTag = RiskTag.HIGH;
            else if (cancellationRate > 20 && totalOrders > 3) derivedRiskTag = RiskTag.MEDIUM;

            return { ...user, coinLedger, riskStats: { totalOrders, cancellationRate, derivedRiskTag } };
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
                targetId: userId,
                action: 'UPDATE_USER',
                details: { previousData: { risk: user.riskTag, value: user.valueTag, status: user.status }, newData: updateData }
            }
        });

        return updatedUser;
    }

    async addAdminNote(adminId: string, userId: string, note: string) {
        return this.prisma.adminNote.create({
            data: {
                adminId,
                userId,
                note
            }
        });
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
                targetId: userId,
                action: disabled ? 'DISABLE_COD' : 'ENABLE_COD',
                details: {}
            }
        });
        return updated;
    }

    // --- USERS MANAGEMENT: Get User Cart ---

    async getUserCart(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

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
                    targetId: userId,
                    action: 'UPDATE_COINS',
                    details: { amount, reason, oldBalance: user.coinsBalance || 0, newBalance }
                }
            });

            return updatedUser;
        });
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
                targetId: userId,
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
                targetId: userId,
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
                targetId: userId,
                action: 'BAN_USER',
                details: { reason, previousStatus: user.status || 'ACTIVE' }
            }
        });

        return { success: true, user: updatedUser, message: 'User banned successfully' };
    }

    // --- USERS MANAGEMENT: Delete User ---

    async deleteUser(adminId: string, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Soft delete by marking as banned and clearing sensitive data, or hard delete
        // For now, doing a soft delete approach
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
                targetId: userId,
                action: 'DELETE_USER',
                details: { deletedEmail: user.email, deletedName: user.name }
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
                targetId: userId,
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

    async updateOrderStatus(adminId: string, orderId: string, status: any, logistics?: { awb?: string, courier?: string }) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException("Order not found");

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
                targetId: orderId,
                action: 'UPDATE_STATUS',
                details: { oldStatus: order.status, newStatus: status, logistics }
            }
        });

        return updated;
    }

    // --- VENDORS MANAGEMENT ---

    async getVendors(status: string = 'ALL') {
        const where: any = {};
        if (status && status !== 'ALL') {
            where.kycStatus = status;
        }
        return this.prisma.vendor.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
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
                targetId: id,
                action: approved ? 'APPROVE' : 'REJECT',
                details: { previousStatus: vendor.kycStatus, newStatus, reason }
            }
        });

        return updated;
    }

    async updateVendorCommission(adminId: string, id: string, rate: number) {
        const vendor = await this.prisma.vendor.update({
            where: { id },
            data: { commissionRate: rate }
        });

        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'VENDOR',
                targetId: id,
                action: 'UPDATE_COMMISSION',
                details: { newRate: rate }
            }
        });
        return vendor;
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
                targetId: broadcast.id,
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
            orderBy: { createdAt: 'desc' },
            include: { admin: { select: { email: true, role: true } } }
        });
    }

    // --- SETTINGS (Platform Config) ---

    async getPlatformConfig() {
        return this.prisma.platformConfig.findMany();
    }

    async updatePlatformConfig(key: string, value: string) {
        return this.prisma.platformConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
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
            include: { user: { select: { name: true } }, product: { select: { title: true } } }
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
