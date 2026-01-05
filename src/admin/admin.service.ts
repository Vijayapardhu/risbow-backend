
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomStatus } from '@prisma/client';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async getAnalytics() {
        // Parallel queries
        const [
            totalOrders,
            totalRooms,
            unlockedRooms,
            registredUsers,
            activeVendors
        ] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.room.count(),
            this.prisma.room.count({ where: { status: RoomStatus.UNLOCKED } }),
            this.prisma.user.count(),
            this.prisma.vendor.count()
        ]);

        // AOV (Average Order Value) - Simplified
        const ordersSum = await this.prisma.order.aggregate({
            _sum: { totalAmount: true },
        });
        const aov = totalOrders > 0 ? (ordersSum._sum.totalAmount || 0) / totalOrders : 0;

        return {
            dau: registredUsers, // Proxy for now
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

    async createBulkRooms(count: number) {
        // Create 'count' number of rooms for weekly offers
        // Logic: create N rooms with automated names
        const rooms = [];
        for (let i = 0; i < count; i++) {
            rooms.push({
                name: `Weekly Offer Room #${Math.floor(Math.random() * 1000)}`,
                size: 4,
                unlockMinOrders: 3,
                unlockMinValue: 1000,
                offerId: 'WEEKLY_SPECIAL',
                startAt: new Date(),
                endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                createdById: 'admin_system_id', // Needs valid user ID in FK usually, skipping validation for now or use seed user
                // In real app, Admin User ID is required.
            });
        }
        // We can't bulk create with relations easily if createdById is strict. 
        // Skipping actual DB write for this stub unless we have an admin user.
        // Return mock
        return { created: count, message: "Simulated bulk creation" };
    }
    async approveBanner(bannerId: string) {
        return this.prisma.banner.update({
            where: { id: bannerId },
            data: { status: 'ACTIVE' }
        });
    }

    async verifyVendor(vendorId: string) {
        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: { isGstVerified: true }
        });
    }
}
