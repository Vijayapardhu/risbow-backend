import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorFollowersService {
    constructor(private prisma: PrismaService) { }

    async getVendorFollowers(vendorId: string, limit = 50, offset = 0) {
        const [followers, total] = await Promise.all([
            this.prisma.vendorFollower.findMany({
                where: { vendorId },
                include: {
                    User: {
                        select: {
                            id: true,
                            name: true,
                            mobile: true,
                            email: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.vendorFollower.count({ where: { vendorId } })
        ]);

        return {
            followers: followers.map(f => ({
                userId: f.userId,
                user: f.User,
                createdAt: f.createdAt,
            })),
            total,
            limit,
            offset,
        };
    }

    async followVendor(userId: string, vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        // Check if already following (Idempotent)
        const check = await this.prisma.vendorFollower.findUnique({
            where: { vendorId_userId: { vendorId, userId } }
        });

        if (check) return { message: 'Already following' };

        // Transaction: Create Follower + Increment Count
        await this.prisma.$transaction([
            this.prisma.vendorFollower.create({
                data: { userId, vendorId }
            }),
            this.prisma.vendor.update({
                where: { id: vendorId },
                data: { followCount: { increment: 1 } }
            })
        ]);

        return { message: 'Followed successfully' };
    }

    async unfollowVendor(userId: string, vendorId: string) {
        const check = await this.prisma.vendorFollower.findUnique({
            where: { vendorId_userId: { vendorId, userId } }
        });

        if (!check) return { message: 'Not following' };

        // Transaction: Delete Follower + Decrement Count
        await this.prisma.$transaction([
            this.prisma.vendorFollower.delete({
                where: { vendorId_userId: { vendorId, userId } }
            }),
            this.prisma.vendor.update({
                where: { id: vendorId },
                data: { followCount: { decrement: 1 } }
            })
        ]);

        return { message: 'Unfollowed successfully' };
    }

    async getFollowerCount(vendorId: string) {
        // Use count or stored field? Stored field is faster.
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: { followCount: true }
        });
        return { count: vendor?.followCount || 0 };
    }

    async isFollowing(userId: string, vendorId: string) {
        const check = await this.prisma.vendorFollower.findUnique({
            where: { vendorId_userId: { vendorId, userId } }
        });
        return { following: !!check };
    }
}
