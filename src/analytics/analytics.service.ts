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
}
