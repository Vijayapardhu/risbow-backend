import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
    constructor(private prisma: PrismaService) { }

    async getDashboardData(period: string) {
        // Use Promise.allSettled to handle individual failures gracefully
        const results = await Promise.allSettled([
            this.getKPIs(period),
            this.getOrderFunnel(),
            this.getRevenueIntelligence(period),
            this.getProductIntelligence(period),
            this.getActionItems(),
            this.getCustomerSignals(period),
            this.getSystemHealth(),
            this.getRecentOrders(),
            this.getTrendingShops()
        ]);

        const [
            kpisResult,
            orderFunnelResult,
            revenueResult,
            productsResult,
            actionsResult,
            customersResult,
            systemResult,
            recentOrdersResult,
            trendingShopsResult
        ] = results;

        return {
            kpis: kpisResult.status === 'fulfilled' ? kpisResult.value : this.getDefaultKPIs(),
            orderFunnel: orderFunnelResult.status === 'fulfilled' ? orderFunnelResult.value : this.getDefaultOrderFunnel(),
            revenue: revenueResult.status === 'fulfilled' ? revenueResult.value : this.getDefaultRevenueIntelligence(),
            products: productsResult.status === 'fulfilled' ? productsResult.value : { topSelling: [] },
            actions: actionsResult.status === 'fulfilled' ? actionsResult.value : [],
            customers: customersResult.status === 'fulfilled' ? customersResult.value : this.getDefaultCustomerSignals(),
            system: systemResult.status === 'fulfilled' ? systemResult.value : this.getDefaultSystemHealth(),
            recentOrders: recentOrdersResult.status === 'fulfilled' ? recentOrdersResult.value : [],
            trendingShops: trendingShopsResult.status === 'fulfilled' ? trendingShopsResult.value : []
        };
    }

    private getDefaultKPIs() {
        return {
            gmv: 0,
            gmvTrend: '+0%',
            commission: 0,
            commissionTrend: '+0%',
            netRevenue: 0,
            revenueTrend: '+0%',
            ordersToday: 0,
            codOrders: 0,
            onlineOrders: 0,
            activeVendors: 0,
            conversionRate: 0
        };
    }

    private getDefaultOrderFunnel() {
        return {
            pending: 0,
            pendingAlert: false,
            confirmed: 0,
            packed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            cancelledSpike: false
        };
    }

    private getDefaultRevenueIntelligence() {
        return {
            onlineSuccessRate: 0,
            codFailureRate: 0,
            refundAmount: 0,
            pendingPayouts: 0
        };
    }

    private getDefaultCustomerSignals() {
        return {
            highReturn: 0,
            abandonedHighValue: 0,
            repeatBuyers: 0
        };
    }

    private getDefaultSystemHealth() {
        return {
            failedPayments: 0,
            apiErrors: 0
        };
    }

    async getTopProducts(limit: number = 5) {
        try {
            // Use raw SQL for faster query - avoid heavy ORM operations
            const products = await this.prisma.$queryRaw`
                SELECT 
                    p.id,
                    p.title as name,
                    p.images,
                    COALESCE(p."salesCount", 0) as sales,
                    COALESCE(p."viewCount", 0) as views,
                    p.price,
                    p."offerPrice"
                FROM "Product" p
                WHERE p."isActive" = true
                ORDER BY p."salesCount" DESC NULLS LAST, p."createdAt" DESC
                LIMIT ${limit}
            `;

            return (products as any[]).map(p => ({
                id: p.id,
                name: p.name,
                image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : 
                       typeof p.images === 'string' ? JSON.parse(p.images)[0] : null,
                price: Number(p.price) || 0,
                originalPrice: Number(p.offerPrice) || Number(p.price) || 0,
                rating: 4.5, // Default rating since we don't have review data
                favorites: Math.floor(Math.random() * 100), // Mock favorites for now
                sales: Number(p.sales) || 0,
                revenue: Number(p.price) * (Number(p.sales) || 0)
            }));
        } catch (error) {
            console.error('Error fetching top products:', error);
            return [];
        }
    }

    async getKPIs(period: string) {
        const dateRange = this.getDateRange(period);

        // GMV (Gross Merchandise Value)
        const gmvResult = await this.prisma.order.aggregate({
            where: {
                createdAt: { gte: dateRange.start, lte: dateRange.end },
                status: { not: 'CANCELLED' },
            },
            _sum: { totalAmount: true },
            _count: true,
        });

        // Platform Commission (assuming 10% commission)
        const commission = (gmvResult._sum.totalAmount || 0) * 0.1;

        // Net Revenue (GMV - Refunds)
        const refundsResult = await this.prisma.order.aggregate({
            where: {
                createdAt: { gte: dateRange.start, lte: dateRange.end },
                status: 'CANCELLED',
            },
            _sum: { totalAmount: true },
        });

        const netRevenue = (gmvResult._sum.totalAmount || 0) - (refundsResult._sum.totalAmount || 0);

        // Orders Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ordersToday = await this.prisma.order.groupBy({
            by: ['razorpayOrderId'],
            where: {
                createdAt: { gte: today },
            },
            _count: true,
        });

        const codOrders = ordersToday.filter(o => !o.razorpayOrderId).length;
        const onlineOrders = ordersToday.filter(o => o.razorpayOrderId).length;

        // Active Vendors
        const activeVendors = await this.prisma.vendor.count({
            where: {
                Product: {
                    some: {
                        createdAt: { gte: dateRange.start },
                    },
                },
            },
        });

        // Conversion Rate (simplified - would need analytics table)
        const conversionRate = 3.2; // Mock - implement with analytics

        // Get total counts for dashboard
        const [totalVendors, totalProducts, totalOrders, totalCustomers, totalRevenue] = await Promise.all([
            this.prisma.vendor.count(),
            this.prisma.product.count({ where: { isActive: true } }),
            this.prisma.order.count(),
            this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
            this.prisma.order.aggregate({
                where: { status: { not: 'CANCELLED' } },
                _sum: { totalAmount: true }
            })
        ]);

        return {
            gmv: gmvResult._sum.totalAmount || 0,
            gmvTrend: '+15.3%', // Calculate from previous period
            commission,
            commissionTrend: '+12.1%',
            netRevenue,
            revenueTrend: '+14.8%',
            ordersToday: ordersToday.length,
            codOrders,
            onlineOrders,
            activeVendors,
            conversionRate,
            // Total counts for dashboard
            totalVendors,
            totalProducts,
            totalOrders,
            totalCustomers,
            totalRevenue: totalRevenue._sum.totalAmount || 0,
        };
    }

    async getOrderFunnel() {
        const ordersByStatus = await this.prisma.order.groupBy({
            by: ['status'],
            _count: true,
        });

        const statusMap = ordersByStatus.reduce((acc, item) => {
            acc[item.status.toLowerCase()] = item._count;
            return acc;
        }, {} as Record<string, number>);

        // Check for SLA violations (orders pending > 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const pendingOld = await this.prisma.order.count({
            where: {
                status: { in: ['CREATED', 'PENDING_PAYMENT'] },
                createdAt: { lt: oneDayAgo },
            },
        });

        return {
            pending: (statusMap['created'] || 0) + (statusMap['pending_payment'] || 0),
            pendingAlert: pendingOld > 0,
            confirmed: statusMap['confirmed'] || 0,
            packed: statusMap['packed'] || 0,
            shipped: statusMap['shipped'] || 0,
            delivered: statusMap['delivered'] || 0,
            cancelled: statusMap['cancelled'] || 0,
            cancelledSpike: false, // Implement spike detection
        };
    }

    async getRevenueIntelligence(period: string) {
        const dateRange = this.getDateRange(period);

        // Payment success rate
        const payments = await this.prisma.payment.groupBy({
            by: ['status'],
            where: {
                createdAt: { gte: dateRange.start },
                provider: { not: 'COD' },
            },
            _count: true,
        });

        const totalPayments = payments.reduce((sum, p) => sum + p._count, 0);
        const successPayments = payments.find(p => p.status === 'SUCCESS')?._count || 0;
        const onlineSuccessRate = totalPayments > 0 ? (successPayments / totalPayments) * 100 : 0;

        // COD failure rate (simplified)
        const codFailureRate = 8.2; // Mock - implement with delivery tracking

        // Refund amount
        const refunds = await this.prisma.payment.aggregate({
            where: {
                status: 'REFUNDED',
                createdAt: { gte: dateRange.start },
            },
            _sum: { amount: true },
        });

        // Pending payouts (mock - implement with payout table)
        const pendingPayouts = 230000;

        return {
            onlineSuccessRate: Math.round(onlineSuccessRate * 10) / 10,
            codFailureRate,
            refundAmount: refunds._sum.amount || 0,
            pendingPayouts,
        };
    }

    async getProductIntelligence(period: string) {
        const dateRange = this.getDateRange(period);

        // Top selling products (simplified - would need order items table)
        const topProducts = await this.prisma.product.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
            },
        });

        return {
            topSelling: topProducts.map(p => ({
                id: p.id,
                name: p.title,
                orders: 234, // Mock - calculate from order items
                revenue: 234000, // Mock
            })),
        };
    }

    async getActionItems() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Orders stuck in pending
        const pendingOrders = await this.prisma.order.count({
            where: {
                status: { in: ['CREATED', 'PENDING_PAYMENT'] },
                createdAt: { lt: oneDayAgo },
            },
        });

        // Vendor approvals
        const pendingVendors = await this.prisma.vendor.count({
            where: { kycStatus: 'PENDING' },
        });

        const actions = [];

        if (pendingOrders > 0) {
            actions.push({
                type: 'pending_orders',
                title: `Orders Stuck in Pending > 24h`,
                description: `${pendingOrders} orders need immediate attention`,
                link: '/admin/orders?status=pending&sla=exceeded',
            });
        }

        if (pendingVendors > 0) {
            actions.push({
                type: 'vendor_approval',
                title: 'Vendor Approval Requests',
                description: `${pendingVendors} vendors waiting for KYC approval`,
                link: '/admin/vendors?status=pending',
            });
        }

        return actions;
    }

    async getCustomerSignals(period: string) {
        // Mock data - implement with proper analytics
        return {
            highReturn: 8,
            abandonedHighValue: 34,
            repeatBuyers: 567,
        };
    }

    async getSystemHealth() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Failed payments in last hour
        const failedPayments = await this.prisma.payment.count({
            where: {
                status: 'FAILED',
                createdAt: { gte: oneHourAgo },
            },
        });

        return {
            failedPayments,
            apiErrors: 5, // Mock - implement with error logging
        };
    }

    async getRecentOrders() {
        try {
            // Use raw SQL for better performance - single query with join
            const orders = await this.prisma.$queryRaw`
                SELECT 
                    o.id,
                    o."totalAmount" as amount,
                    o.status,
                    o."createdAt" as date,
                    COALESCE(o.items, '[]') as items,
                    COALESCE(u.name, u.mobile, 'Unknown') as customer,
                    u.email
                FROM "Order" o
                LEFT JOIN "User" u ON o."userId" = u.id
                ORDER BY o."createdAt" DESC
                LIMIT 5
            `;

            return (orders as any[]).map(order => ({
                id: order.id,
                customer: order.customer || 'Unknown',
                avatar: null,
                email: order.email,
                amount: Number(order.amount) || 0,
                status: order.status,
                date: order.date,
                items: Array.isArray(order.items) ? order.items.length : 
                       typeof order.items === 'string' ? JSON.parse(order.items).length : 0
            }));
        } catch (error) {
            console.error('Error fetching recent orders:', error);
            return [];
        }
    }

    async getTrendingShops() {
        const vendors = await this.prisma.vendor.findMany({
            take: 5,
            orderBy: { followCount: 'desc' },
            include: {
                Product: {
                    select: { id: true }
                }
            }
        });

        return vendors.map(vendor => ({
            id: vendor.id,
            name: vendor.name,
            logo: null, // Placeholder or add to schema if needed
            category: vendor.tier, // Use tier as simplified category proxy or fetch properly
            sales: Math.floor(Math.random() * 500) + 50, // Mock sales number as aggregation is complex
            revenue: Math.floor(Math.random() * 500000) + 50000, // Mock revenue
            trend: '+' + (Math.floor(Math.random() * 10) + 2) + '%'
        }));
    }

    async getStats() {
        try {
            // Use a single raw SQL query for all aggregations - much faster than multiple count queries
            const statsResult = await this.prisma.$queryRaw`
                SELECT 
                    (SELECT COUNT(*) FROM "User") as total_users,
                    (SELECT COUNT(*) FROM "Vendor") as total_vendors,
                    (SELECT COUNT(*) FROM "Order") as total_orders,
                    (SELECT COALESCE(SUM("totalAmount"), 0) FROM "Order" WHERE status != 'CANCELLED') as total_revenue,
                    (SELECT COUNT(*) FROM "Order" WHERE status IN ('PENDING', 'CREATED', 'PENDING_PAYMENT')) as pending_orders,
                    (SELECT COUNT(*) FROM "Order" WHERE status = 'CONFIRMED') as confirmed_orders,
                    (SELECT COUNT(*) FROM "Order" WHERE status = 'PACKED') as processing_orders,
                    (SELECT COUNT(*) FROM "Order" WHERE status = 'SHIPPED') as shipped_orders,
                    (SELECT COUNT(*) FROM "Order" WHERE status = 'DELIVERED') as delivered_orders,
                    (SELECT COUNT(*) FROM "Order" WHERE status = 'CANCELLED') as cancelled_orders,
                    (SELECT COUNT(*) FROM "Product" WHERE "isActive" = true) as active_products,
                    (SELECT COALESCE(SUM("totalAmount"), 0) * 0.1 FROM "Order" WHERE status != 'CANCELLED') as total_commission
            `;

            const stats = (statsResult as any[])[0];

            return {
                totalUsers: Number(stats.total_users) || 0,
                totalVendors: Number(stats.total_vendors) || 0,
                totalOrders: Number(stats.total_orders) || 0,
                totalRevenue: Number(stats.total_revenue) || 0,
                pendingOrders: Number(stats.pending_orders) || 0,
                confirmedOrders: Number(stats.confirmed_orders) || 0,
                processingOrders: Number(stats.processing_orders) || 0,
                shippedOrders: Number(stats.shipped_orders) || 0,
                deliveredOrders: Number(stats.delivered_orders) || 0,
                cancelledOrders: Number(stats.cancelled_orders) || 0,
                activeProducts: Number(stats.active_products) || 0,
                userGrowth: 0,
                revenueGrowth: 0,
                totalWithdrawn: Number(stats.total_withdrawn) || 0,
                pendingWithdraw: 0,
                totalCommission: Math.floor(Number(stats.total_commission) || 0),
                rejectedWithdraw: 0
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            // Return default stats on error to prevent frontend crash
            return {
                totalUsers: 0,
                totalVendors: 0,
                totalOrders: 0,
                totalRevenue: 0,
                pendingOrders: 0,
                confirmedOrders: 0,
                processingOrders: 0,
                shippedOrders: 0,
                deliveredOrders: 0,
                cancelledOrders: 0,
                activeProducts: 0,
                userGrowth: 0,
                revenueGrowth: 0,
                totalWithdrawn: 0,
                pendingWithdraw: 0,
                totalCommission: 0,
                rejectedWithdraw: 0
            };
        }
    }

    private getDateRange(period: string): { start: Date; end: Date } {
        const end = new Date();
        let start = new Date();

        switch (period) {
            case 'Today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'Yesterday':
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'Last 7 Days':
                start.setDate(start.getDate() - 7);
                break;
            case 'Last 30 Days':
                start.setDate(start.getDate() - 30);
                break;
            default:
                start.setDate(start.getDate() - 7);
        }

        return { start, end };
    }
}
