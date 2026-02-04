import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardStats() {
        // 1. GMV (Total Sales) - Aggregated from confirmed/delivered orders
        const salesAgg = await this.prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } }
        });

        // 2. Total Orders
        const totalOrders = await this.prisma.order.count();

        // 3. Active Users
        const totalUsers = await this.prisma.user.count({ where: { role: 'CUSTOMER' } });

        // 4. Active Rooms
        const activeRooms = await this.prisma.room.count({ where: { status: 'ACTIVE' } });

        // 5. Active Vendors
        const activeVendors = await this.prisma.user.count({ where: { role: 'VENDOR' } });

        return {
            gmv: salesAgg._sum.totalAmount || 0,
            totalOrders,
            totalUsers,
            activeRooms,
            activeVendors
        };
    }

    async getSalesChart(period: 'week' | 'month' = 'week') {
        // Raw query for aggregation by date might be needed for perf, 
        // but for now we fetch recent orders and aggregate in JS for simplicity/safety

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

        // specific aggregation logic
        const grouped = orders.reduce((acc, order) => {
            const date = order.createdAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + order.totalAmount;
            return acc;
        }, {});

        // Fill missing dates
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
    async getSearchMisses() {
        return this.prisma.productSearchMiss.findMany({
            orderBy: { count: 'desc' },
            take: 50,
            include: { Category: { select: { name: true } } }
        });
    }

    async getFunnelStats() {
        // Funnel: Visited -> Cart -> Checkout -> Order
        const totalUsers = await this.prisma.user.count({ where: { role: 'CUSTOMER' } });

        const cartUsers = await this.prisma.cart.count({
            where: { items: { some: {} } }
        });

        const checkoutStarted = await this.prisma.abandonedCheckout.count();

        const orderUsers = await this.prisma.order.count({
            where: { status: { not: 'CANCELLED' } }
        });

        return {
            totalUsers,
            activeCarts: cartUsers,
            checkoutStarted,
            convertedUsers: orderUsers,
            cartToOrderRate: cartUsers > 0 ? (orderUsers / cartUsers) * 100 : 0
        };
    }

    async getROIReport() {
        const bowActions = await (this.prisma as any).bowActionLog.aggregate({
            _sum: { attributedRevenue: true },
            _count: { id: true }
        });

        const totalRevenue = bowActions._sum.attributedRevenue || 0;
        const totalActions = bowActions._count.id;

        return {
            bow: {
                totalRevenue,
                totalActions,
                revenuePerAction: totalActions > 0 ? totalRevenue / totalActions : 0
            }
        };
    }

    /**
     * Gets comprehensive abandonment metrics including recovery rates and channel performance.
     */
    async getAbandonmentMetrics(days: number = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        // Total abandoned checkouts
        const totalAbandoned = await this.prisma.abandonedCheckout.count({
            where: { createdAt: { gte: since } }
        });

        // Converted checkouts
        const converted = await this.prisma.abandonedCheckout.count({
            where: {
                createdAt: { gte: since },
                status: 'CONVERTED'
            }
        });

        // Get all converted checkouts with their metadata to extract recovery channel
        const convertedCheckouts = await this.prisma.abandonedCheckout.findMany({
            where: {
                createdAt: { gte: since },
                status: 'CONVERTED'
            },
            select: {
                id: true,
                financeSnapshot: true,
                metadata: true,
                orders: {
                    select: { totalAmount: true }
                }
            }
        });

        // Calculate total recovered value
        let totalRecoveredValue = 0;
        const channelStats: Record<string, { count: number; revenue: number; cost: number }> = {
            PUSH: { count: 0, revenue: 0, cost: 0 },
            WHATSAPP: { count: 0, revenue: 0, cost: 0 },
            TELECALLER: { count: 0, revenue: 0, cost: 0 },
            SELF: { count: 0, revenue: 0, cost: 0 }, // User returned on their own
        };

        // Channel cost estimates (in paise)
        const CHANNEL_COSTS = {
            PUSH: 0, // Free
            WHATSAPP: 5, // ₹0.05 per message
            TELECALLER: 200, // ₹2 per call (agent time)
            SELF: 0, // Free
        };

        for (const checkout of convertedCheckouts) {
            const metadata = (checkout.metadata as any) || {};
            const recoveryChannel = metadata.recoveryChannel || 'SELF';
            const finance = checkout.financeSnapshot as any;
            const orderValue = checkout.orders?.[0]?.totalAmount || finance?.totalAmount || 0;
            
            // Convert to paise if needed (order.totalAmount might be in rupees)
            const valueInPaise = orderValue > 100000 ? orderValue : orderValue * 100;
            totalRecoveredValue += valueInPaise;

            if (!channelStats[recoveryChannel]) {
                channelStats[recoveryChannel] = { count: 0, revenue: 0, cost: 0 };
            }

            channelStats[recoveryChannel].count++;
            channelStats[recoveryChannel].revenue += valueInPaise;
            channelStats[recoveryChannel].cost += CHANNEL_COSTS[recoveryChannel] || 0;
        }

        // Calculate ROI for each channel
        const channelROI = Object.entries(channelStats).map(([channel, stats]) => ({
            channel,
            conversions: stats.count,
            revenue: stats.revenue,
            cost: stats.cost,
            roi: stats.cost > 0 ? ((stats.revenue - stats.cost) / stats.cost) * 100 : stats.revenue > 0 ? Infinity : 0,
            revenuePerConversion: stats.count > 0 ? stats.revenue / stats.count : 0,
            costPerConversion: stats.count > 0 ? stats.cost / stats.count : 0,
        }));

        // Status breakdown
        const statusBreakdown = await this.prisma.abandonedCheckout.groupBy({
            by: ['status'],
            where: { createdAt: { gte: since } },
            _count: { id: true }
        });

        // Abandon reason breakdown
        const reasonBreakdown = await this.prisma.abandonedCheckout.groupBy({
            by: ['abandonReason'],
            where: { createdAt: { gte: since } },
            _count: { id: true }
        });

        return {
            period: { days, since, until: new Date() },
            summary: {
                totalAbandoned,
                converted,
                dropped: totalAbandoned - converted,
                recoveryRate: totalAbandoned > 0 ? (converted / totalAbandoned) * 100 : 0,
                totalRecoveredValue,
                averageRecoveredValue: converted > 0 ? totalRecoveredValue / converted : 0,
            },
            channelPerformance: channelROI,
            statusBreakdown: statusBreakdown.map(s => ({ status: s.status, count: s._count.id })),
            reasonBreakdown: reasonBreakdown.map(r => ({ reason: r.abandonReason || 'UNKNOWN', count: r._count.id })),
        };
    }

    /**
     * Gets telecaller performance metrics.
     */
    async getTelecallerPerformance(days: number = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        // Get all telecallers with their performance
        const telecallers = await this.prisma.user.findMany({
            where: { role: 'TELECALLER', status: 'ACTIVE' },
            include: {
                assignedLeads: {
                    where: { createdAt: { gte: since } },
                    select: {
                        id: true,
                        status: true,
                        financeSnapshot: true,
                        orders: {
                            select: { totalAmount: true }
                        }
                    }
                }
            }
        });

        const performance = telecallers.map(agent => {
            const leads = agent.assignedLeads;
            const converted = leads.filter(l => l.status === 'CONVERTED');
            const totalValue = converted.reduce((sum, lead) => {
                const orderValue = lead.orders?.[0]?.totalAmount || 0;
                const finance = lead.financeSnapshot as any;
                const value = orderValue > 100000 ? orderValue : (finance?.totalAmount || orderValue * 100);
                return sum + value;
            }, 0);

            return {
                agentId: agent.id,
                agentName: agent.name || 'Unknown',
                totalLeads: leads.length,
                converted: converted.length,
                dropped: leads.filter(l => l.status === 'DROPPED').length,
                conversionRate: leads.length > 0 ? (converted.length / leads.length) * 100 : 0,
                totalRevenue: totalValue,
                averageOrderValue: converted.length > 0 ? totalValue / converted.length : 0,
            };
        });

        return {
            period: { days, since, until: new Date() },
            telecallers: performance,
            summary: {
                totalAgents: performance.length,
                totalLeads: performance.reduce((sum, p) => sum + p.totalLeads, 0),
                totalConverted: performance.reduce((sum, p) => sum + p.converted, 0),
                totalRevenue: performance.reduce((sum, p) => sum + p.totalRevenue, 0),
                averageConversionRate: performance.length > 0
                    ? performance.reduce((sum, p) => sum + p.conversionRate, 0) / performance.length
                    : 0,
            }
        };
    }

    /**
     * Gets abandonment trends over time.
     */
    async getAbandonmentTrends(days: number = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const checkouts = await this.prisma.abandonedCheckout.findMany({
            where: { createdAt: { gte: since } },
            select: {
                createdAt: true,
                status: true,
                financeSnapshot: true,
                metadata: true,
            }
        });

        // Group by date
        const dailyStats: Record<string, { abandoned: number; converted: number; revenue: number }> = {};

        for (const checkout of checkouts) {
            const date = checkout.createdAt.toISOString().split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { abandoned: 0, converted: 0, revenue: 0 };
            }

            dailyStats[date].abandoned++;
            if (checkout.status === 'CONVERTED') {
                dailyStats[date].converted++;
                const finance = checkout.financeSnapshot as any;
                dailyStats[date].revenue += finance?.totalAmount || 0;
            }
        }

        // Fill missing dates and format
        const trends = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const stats = dailyStats[dateStr] || { abandoned: 0, converted: 0, revenue: 0 };
            trends.push({
                date: dateStr,
                ...stats,
                recoveryRate: stats.abandoned > 0 ? (stats.converted / stats.abandoned) * 100 : 0,
            });
        }

        return trends.reverse(); // Oldest first
    }
}
