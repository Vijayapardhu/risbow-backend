import { Injectable, NotFoundException } from '@nestjs/common';
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
            activeVendors,
            ordersSum
        ] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.room.count(),
            this.prisma.room.count({ where: { status: RoomStatus.UNLOCKED } }),
            this.prisma.user.count(),
            this.prisma.vendor.count({ where: { kycStatus: 'APPROVED' } }),
            this.prisma.order.aggregate({ _sum: { totalAmount: true } })
        ]);

        const totalRevenue = ordersSum._sum.totalAmount || 0;
        const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return {
            dau: registredUsers,
            totalOrders,
            totalRevenue,
            aov,
            rooms: {
                total: totalRooms,
                unlocked: unlockedRooms,
                unlockRate: totalRooms > 0 ? (unlockedRooms / totalRooms) * 100 : 0
            },
            vendors: activeVendors
        };
    }

    // --- USERS MANAGEMENT ---

    async getUsers(page: number = 1, search?: string) {
        const take = 20;
        const skip = (page - 1) * take;
        const where: any = {};

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

    async updateUserCoins(adminId: string, userId: string, amount: number, reason: string) {
        // Transaction to update balance and log audit
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new NotFoundException('User not found');

            const newBalance = user.coinsBalance + amount;

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coinsBalance: newBalance }
            });

            // Log Audit
            await tx.auditLog.create({
                data: {
                    adminId,
                    entity: 'USER',
                    targetId: userId, // Fixed field name
                    action: 'UPDATE_COINS',
                    details: { amount, reason, oldBalance: user.coinsBalance, newBalance }
                }
            });

            return updatedUser;
        });
    }

    // --- VENDORS MANAGEMENT ---

    async getVendors(status: string = 'ALL') {
        const where: any = {};
        if (status !== 'ALL') {
            where.kycStatus = status;
        }
        return this.prisma.vendor.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }

    async approveVendor(adminId: string, vendorId: string, approved: boolean) {
        const status = approved ? 'APPROVED' : 'REJECTED';

        const vendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { kycStatus: status, isGstVerified: approved }
        });

        await this.prisma.auditLog.create({
            data: {
                adminId,
                entity: 'VENDOR',
                targetId: vendorId, // Fixed field name
                action: approved ? 'APPROVE_VENDOR' : 'REJECT_VENDOR',
                details: { status }
            }
        });
        return vendor;
    }

    // --- ROOMS & CATALOG ---

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

    // --- CONTENT ---

    async getBanners() {
        return this.prisma.banner.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async addBanner(data: any) {
        return this.prisma.banner.create({ data });
    }

    async deleteBanner(id: string) {
        return this.prisma.banner.delete({ where: { id } });
    }
}
