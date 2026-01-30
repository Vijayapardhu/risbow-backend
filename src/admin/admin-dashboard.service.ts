import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
    constructor(private prisma: PrismaService) { }

    async getDashboardData(period: string) {
        const [kpis, orderFunnel, revenue, products, actions, customers, system, recentOrders, trendingShops] = await Promise.all([
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

        return {
            kpis,
            orderFunnel,
            revenue,
            products,
            actions,
            customers,
            system,
            recentOrders,
            trendingShops
        };
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
                products: {
                    some: {
                        createdAt: { gte: dateRange.start },
                    },
                },
            },
        });

        // Conversion Rate (simplified - would need analytics table)
        const conversionRate = 3.2; // Mock - implement with analytics

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
        const orders = await this.prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        mobile: true
                    }
                }
            }
        });

        return orders.map(order => ({
            id: order.id,
            customer: order.user.name || order.user.mobile,
            avatar: null,
            email: order.user.email,
            amount: order.totalAmount,
            status: order.status,
            date: order.createdAt,
            items: (order.items as any[]).length // Simplified for dashboard
        }));
    }

    async getTrendingShops() {
        const vendors = await this.prisma.vendor.findMany({
            take: 5,
            orderBy: { followCount: 'desc' },
            include: {
                products: {
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
        const [
            totalUsers,
            totalVendors,
            totalOrders,
            totalRevenue,
            pendingOrders,
            confirmedOrders,
            processingOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            activeProducts,
            totalWithdrawn,
            pendingWithdraw,
            totalCommission,
            rejectedWithdraw
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.vendor.count(),
            this.prisma.order.count(),
            this.prisma.order.aggregate({
                where: { status: { not: 'CANCELLED' } },
                _sum: { totalAmount: true }
            }),
            this.prisma.order.count({ where: { status: { in: ['PENDING', 'CREATED', 'PENDING_PAYMENT'] } } }),
            this.prisma.order.count({ where: { status: 'CONFIRMED' } }),
            this.prisma.order.count({ where: { status: 'PACKED' } }),
            this.prisma.order.count({ where: { status: 'SHIPPED' } }),
            this.prisma.order.count({ where: { status: 'DELIVERED' } }),
            this.prisma.order.count({ where: { status: 'CANCELLED' } }),
            this.prisma.product.count({ where: { isActive: true } }),
            // Mock values for withdraw stats - implement with actual payout table
            Promise.resolve(0),
            Promise.resolve(0),
            this.prisma.order.aggregate({
                where: { status: { not: 'CANCELLED' } },
                _sum: { totalAmount: true }
            }).then(r => Math.floor((r._sum.totalAmount || 0) * 0.1)),
            Promise.resolve(0)
        ]);

        return {
            totalUsers,
            totalVendors,
            totalOrders,
            totalRevenue: totalRevenue._sum.totalAmount || 0,
            pendingOrders,
            confirmedOrders,
            processingOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            activeProducts,
            userGrowth: 0,
            revenueGrowth: 0,
            totalWithdrawn,
            pendingWithdraw,
            totalCommission,
            rejectedWithdraw
        };
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
