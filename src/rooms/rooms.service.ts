import { ForbiddenException, Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus, MemberStatus, OrderStatus, RoomType } from '@prisma/client';
import { RoomsGateway } from './rooms.gateway';
import { RedisService } from '../shared/redis.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLogService } from '../audit/audit.service';

@Injectable()
export class RoomsService {
    constructor(
        private prisma: PrismaService,
        private roomsGateway: RoomsGateway,
        private redis: RedisService,
        private config: ConfigService,
        private audit: AuditLogService,
    ) { }

    async getRoomProgress(roomId: string) {
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room) throw new NotFoundException('Room not found');
        const stats = await this.prisma.order.aggregate({
            where: { roomId, status: { in: ['CONFIRMED', 'DELIVERED', 'SHIPPED', 'PACKED', 'PAID'] } },
            _count: { id: true },
            _sum: { totalAmount: true }
        });
        return {
            orderedCount: stats._count.id,
            totalOrderValue: stats._sum.totalAmount || 0,
            unlockMinOrders: room.unlockMinOrders,
            unlockMinValue: room.unlockMinValue,
            unlocked: room.status === 'UNLOCKED',
        };
    }

    async getRoomCountdown(roomId: string) {
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room) throw new NotFoundException('Room not found');
        const now = new Date();
        const endAt = new Date(room.endAt);
        const msLeft = endAt.getTime() - now.getTime();
        return {
            endsAt: endAt,
            msLeft: msLeft > 0 ? msLeft : 0,
            secondsLeft: msLeft > 0 ? Math.floor(msLeft / 1000) : 0,
        };
    }

    async create(userId: string, dto: CreateRoomDto) {
        const minSize = this.config.get<number>('ROOM_MIN_SIZE', 2);
        const maxSize = this.config.get<number>('ROOM_MAX_SIZE', 10);

        if (dto.size < minSize || dto.size > maxSize) {
            throw new BadRequestException(`Room size must be between ${minSize} and ${maxSize} members`);
        }

        const activeOffer = await this.prisma.weeklyOffer.findFirst({
            where: { isActive: true, endAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' }
        });

        if (!activeOffer) {
            throw new BadRequestException('No active Weekly Offer available to start a room.');
        }

        const room = await this.prisma.room.create({
            data: {
                id: randomUUID(),
                name: dto.name,
                size: dto.size,
                unlockMinOrders: dto.unlockMinOrders,
                unlockMinValue: dto.unlockMinValue,
                offerId: activeOffer.id,
                createdById: userId,
                isSystemRoom: false,
                startAt: new Date(),
                endAt: activeOffer.endAt,
                RoomMember: {
                    create: {
                        userId,
                        status: MemberStatus.PENDING,
                    },
                },
            },
            include: { RoomMember: true },
        });

        await this.addActivity(room.id, 'MEMBER_JOINED', `Host ${userId} created the room!`, { userId });
        return room;
    }

    async join(roomId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { RoomMember: { where: { userId } } }
            });

            if (!room) throw new NotFoundException('Room not found');
            if (room.status !== RoomStatus.LOCKED && room.status !== RoomStatus.ACTIVE) {
                throw new ForbiddenException('Room is not active or locked');
            }
            if (room.RoomMember.length > 0) {
                return { message: 'Already joined', member: room.RoomMember[0] };
            }

            const updated = await tx.room.updateMany({
                where: {
                    id: roomId,
                    memberCount: { lt: room.size },
                    status: { in: [RoomStatus.ACTIVE, RoomStatus.LOCKED] }
                },
                data: { memberCount: { increment: 1 } }
            });

            if (updated.count === 0) {
                throw new ForbiddenException('Room is full or no longer active');
            }

            const member = await tx.roomMember.create({
                data: {
                    roomId,
                    userId,
                    status: MemberStatus.PENDING,
                },
            });

            this.roomsGateway.server.to(roomId).emit('room_update', {
                type: 'MEMBER_JOINED',
                userId,
                count: room.memberCount + 1,
            });

            await this.addActivity(roomId, 'MEMBER_JOINED', `User ${userId} joined the hunt!`, { userId });

            return member;
        });
    }

    async checkUnlockStatus(roomId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({ where: { id: roomId } });
            if (!room || room.status === 'UNLOCKED' || room.status === 'EXPIRED') {
                return { orderedCount: 0, totalOrderValue: 0, unlocked: room?.status === 'UNLOCKED' };
            }

            const stats = await tx.order.aggregate({
                where: {
                    roomId,
                    status: { in: ['CONFIRMED', 'DELIVERED', 'SHIPPED', 'PACKED', 'PAID'] }
                },
                _count: { id: true },
                _sum: { totalAmount: true }
            });

            const orderedCount = stats._count.id;
            const totalOrderValue = stats._sum.totalAmount || 0;

            if (orderedCount >= room.unlockMinOrders && totalOrderValue >= room.unlockMinValue) {
                const result = await tx.room.updateMany({
                    where: { id: roomId, status: { not: 'UNLOCKED' } },
                    data: { status: 'UNLOCKED' }
                });

                if (result.count > 0) {
                    const message = `Congratulations! Room unlocked with ${orderedCount} orders and ₹${totalOrderValue / 100} value!`;
                    await this.addActivity(roomId, 'ROOM_UNLOCKED', message);

                    await this.audit.logAdminAction('SYSTEM', 'ROOM_UNLOCK', 'Room', roomId, {
                        orders: orderedCount,
                        value: totalOrderValue
                    });

                    this.roomsGateway.server.to(roomId).emit('room_update', {
                        type: 'ROOM_UNLOCKED',
                        status: 'UNLOCKED',
                        orderedCount,
                        totalOrderValue
                    });

                    await this.onRoomUnlocked(roomId);
                }
            }

            return { orderedCount, totalOrderValue, unlocked: orderedCount >= room.unlockMinOrders && totalOrderValue >= room.unlockMinValue };
        });
    }

    /**
     * Phase 3.1: Calculate current linear discount.
     * Formula: min(joinedMembers * (maxDiscount / maxMembers), maxDiscount)
     */
    calculateCurrentDiscount(room: any): number {
        if (!room.maxDiscount || !room.maxMembers) return 0;
        // Stored in DB as basis points of percentage (80% => 8000)
        const maxDiscountBp = Number(room.maxDiscount);
        const maxMembers = Number(room.maxMembers);
        const memberCount = Number(room.memberCount || 0);

        // discountBp = min(maxDiscountBp, round(memberCount * maxDiscountBp / maxMembers))
        const discountBp = Math.min(
            maxDiscountBp,
            Math.round((memberCount * maxDiscountBp) / maxMembers),
        );

        // Return percentage with 2 decimals (bp -> %)
        return Number((discountBp / 100).toFixed(2));
    }

    /**
     * Phase 3.1: Create a specialized discount room.
     */
    async createDiscountRoom(userId: string, dto: { productId: string, maxDiscount: number, maxMembers: number, name: string }) {
        // Validate product exists
        const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
        if (!product) throw new NotFoundException('Product not found');

        return await this.prisma.room.create({
            data: {
                id: randomUUID(),
                name: dto.name,
                type: RoomType.LINEAR_DISCOUNT,
                productId: dto.productId,
                // Store as basis points (80% => 8000). Allows 2-decimal percent inputs.
                maxDiscount: Math.round(dto.maxDiscount * 100),
                maxMembers: dto.maxMembers,
                size: dto.maxMembers,
                status: RoomStatus.OPEN,
                createdById: userId,
                startAt: new Date(),
                endAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
                RoomMember: {
                    create: {
                        userId,
                        status: MemberStatus.PENDING,
                    },
                },
                memberCount: 1,
                unlockMinOrders: 0, // Not used for this type
                unlockMinValue: 0,
            }
        });
    }

    /**
     * Phase 3.1: Atomic join for Linear Discount rooms.
     * Uses transaction and updateMany with where clause to ensure no overflow.
     */
    async joinDiscountRoom(roomId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const room = await tx.room.findFirst({
                where: { id: roomId, type: RoomType.LINEAR_DISCOUNT },
                include: { RoomMember: { where: { userId } } }
            });

            if (!room) throw new NotFoundException('Discount Room not found');
            if (room.status !== RoomStatus.OPEN) throw new ForbiddenException('Room is not open for joining');
            if (room.RoomMember.length > 0) return { message: 'Already in room', roomId };

            // Atomic increment with condition
            const updated = await tx.room.updateMany({
                where: {
                    id: roomId,
                    memberCount: { lt: room.maxMembers! },
                    status: RoomStatus.OPEN
                },
                data: {
                    memberCount: { increment: 1 }
                }
            });

            if (updated.count === 0) {
                throw new ForbiddenException('Room reached capacity or status changed');
            }

            // Create membership
            const member = await tx.roomMember.create({
                data: { roomId, userId, status: MemberStatus.PENDING }
            });

            // If room just hit capacity, lock it automatically as per requested "LOCK room when maxMembers reached"
            const finalRoom = await tx.room.findUnique({ where: { id: roomId } });
            if (finalRoom && finalRoom.memberCount >= finalRoom.maxMembers!) {
                await tx.room.update({
                    where: { id: roomId },
                    data: { status: RoomStatus.LOCKED }
                });
            }

            const currentDiscount = this.calculateCurrentDiscount(finalRoom);

            await this.addActivity(roomId, 'MEMBER_JOINED', `A new member joined! Current Discount: ${currentDiscount}%`);

            this.roomsGateway.server.to(roomId).emit('room_update', {
                type: 'JOIN_SUCCESS',
                memberCount: finalRoom?.memberCount ?? 0,
                currentDiscount
            });

            return { member, currentDiscount };
        });
    }

    /**
     * Phase 3.1: Atomic leave for Linear Discount rooms.
     */
    async leaveDiscountRoom(roomId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const room = await tx.room.findFirst({
                where: { id: roomId, type: 'LINEAR_DISCOUNT' }
            });

            if (!room) throw new NotFoundException('Room not found');
            if (room.status === 'LOCKED' || (room.status as any) === 'COMPLETED') {
                throw new ForbiddenException('Cannot leave once purchase has started or completed');
            }

            const member = await tx.roomMember.findUnique({
                where: { roomId_userId: { roomId, userId } }
            });
            if (!member) throw new ForbiddenException('You are not a member of this room');

            const result = await tx.roomMember.deleteMany({
                where: { roomId, userId }
            });

            if (result.count > 0) {
                await tx.room.update({
                    where: { id: roomId },
                    data: { memberCount: { decrement: 1 } }
                });

                const updatedRoom = await tx.room.findUnique({ where: { id: roomId } });
                const currentDiscount = this.calculateCurrentDiscount(updatedRoom);

                await this.addActivity(roomId, 'MEMBER_LEFT', `A member left. Current Discount: ${currentDiscount}%`);

                this.roomsGateway.server.to(roomId).emit('room_update', {
                    type: 'LEAVE_SUCCESS',
                    memberCount: updatedRoom?.memberCount ?? 0,
                    currentDiscount
                });
            }

            return { success: true };
        });
    }

    /**
     * Phase 3.1: Atomic purchase start (Lock Room).
     */
    async initiatePurchase(roomId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const room = await tx.room.findFirst({
                where: { id: roomId, type: 'LINEAR_DISCOUNT' },
                include: { RoomMember: true }
            });

            if (!room) throw new NotFoundException('Room not found');
            if ((room.status as any) !== 'OPEN' && room.status !== 'LOCKED') {
                throw new ForbiddenException('Room is not available for purchase');
            }

            const isMember = room.RoomMember.some(m => m.userId === userId);
            if (!isMember) throw new ForbiddenException('Only room members can initiate purchase');

            // Final lock
            await tx.room.update({
                where: { id: roomId },
                data: { status: 'LOCKED' }
            });

            const finalDiscount = this.calculateCurrentDiscount(room);

            await this.addActivity(roomId, 'PURCHASE_INITIATED', `Purchase flow started with ${finalDiscount}% discount!`);

            return { finalDiscount, memberCount: room.memberCount };
        });
    }

    async linkOrder(roomId: string, userId: string, orderId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { RoomMember: true }
            });
            if (!room) throw new NotFoundException('Room not found');

            const member = room.RoomMember.find(m => m.userId === userId);
            if (!member) throw new ForbiddenException('You are not a member of this room');

            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (!order) throw new NotFoundException('Order not found');
            if (order.userId !== userId) throw new ForbiddenException('Order does not belong to you');
            if (order.roomId) throw new BadRequestException('Order already linked to a room');

            const orderDate = new Date(order.createdAt);
            if (orderDate < new Date(room.startAt) || orderDate > new Date(room.endAt)) {
                throw new BadRequestException('Order must be within room timeframe');
            }

            const offer = await tx.weeklyOffer.findUnique({ where: { id: room.offerId } });
            const rules = offer?.rules as any;
            if (rules?.eligibleProductIds) {
                const orderItems = order.itemsSnapshot as any[];
                const allEligible = orderItems.every(item => rules.eligibleProductIds.includes(item.productId));
                if (!allEligible) throw new BadRequestException('Order contains products not eligible for this room offer');
            }

            await tx.order.update({
                where: { id: orderId },
                data: { roomId }
            });

            await tx.roomMember.update({
                where: { roomId_userId: { roomId, userId } },
                data: { status: MemberStatus.ORDERED }
            });

            await this.addActivity(roomId, 'ORDER_PLACED', `Someone just added ₹${order.totalAmount / 100} to the unlock goal!`, { orderId, userId });

            await this.checkUnlockStatus(roomId);

            return { message: 'Order linked successfully' };
        });
    }

    async forceUnlock(roomId: string) {
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room) throw new NotFoundException('Room not found');

        const updated = await this.prisma.room.update({
            where: { id: roomId },
            data: { status: RoomStatus.UNLOCKED }
        });

        this.roomsGateway.server.to(roomId).emit('room_update', {
            type: 'UNLOCKED',
            status: RoomStatus.UNLOCKED,
            forced: true
        });

        await this.onRoomUnlocked(roomId);

        return updated;
    }

    private async onRoomUnlocked(roomId: string) {
        const upsellKey = `room:upsell:${roomId}`;
        await this.redis.set(upsellKey, 'ACTIVE', 600); // 10 min

        await this.addActivity(roomId, 'UPSELL_WINDOW_STARTED', 'Flash Deal Window Started! ⚡ 10 minutes to grab accessories at 50% off!');

        this.roomsGateway.server.to(roomId).emit('room_update', {
            type: 'UPSELL_WINDOW_STARTED',
            endsInSeconds: 600
        });
    }

    async expireRoom(roomId: string) {
        return this.prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({ where: { id: roomId } });
            if (!room || room.status === RoomStatus.EXPIRED) return room;

            const updated = await tx.room.update({
                where: { id: roomId },
                data: { status: RoomStatus.EXPIRED }
            });

            const offer = await tx.weeklyOffer.findUnique({ where: { id: room.offerId } });
            const rules = offer?.rules as any;

            if (rules?.onExpiry === 'CANCEL_ORDERS' && room.status !== RoomStatus.UNLOCKED) {
                await tx.order.updateMany({
                    where: { roomId, status: { notIn: [OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.SHIPPED] } },
                    data: { status: OrderStatus.CANCELLED }
                });
            }

            this.roomsGateway.server.to(roomId).emit('room_update', {
                type: 'EXPIRED',
                status: RoomStatus.EXPIRED,
                forced: true
            });

            await tx.auditLog.create({
                data: {
                    id: randomUUID(),
                    adminId: 'SYSTEM',
                    entity: 'Room',
                    action: 'EXPIRE',
                    entityId: roomId,
                    details: { finalStatus: room.status, memberCount: room.memberCount }
                }
            });

            return updated;
        });
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleExpiredRooms() {
        const expired = await this.prisma.room.findMany({
            where: {
                endAt: { lt: new Date() },
                status: { in: [RoomStatus.ACTIVE, RoomStatus.LOCKED] }
            },
            select: { id: true }
        });

        for (const room of expired) {
            try {
                await this.expireRoom(room.id);
            } catch (e) {
                console.error(`Failed to expire room ${room.id}`, e);
            }
        }
    }

    async addActivity(roomId: string, type: string, message: string, meta?: any) {
        const key = `room:feed:${roomId}`;
        const activity = {
            id: Date.now().toString(),
            type,
            message,
            timestamp: new Date().toISOString(),
            meta
        };
        await this.redis.lpush(key, JSON.stringify(activity));
        await this.redis.ltrim(key, 0, 99);
    }

    async getFeed(roomId: string, page: number = 1, limit: number = 20) {
        const key = `room:feed:${roomId}`;
        const start = (page - 1) * limit;
        const stop = start + limit - 1;
        const items = await this.redis.lrange(key, start, stop);
        return {
            items: items.map(i => JSON.parse(i)),
            page,
            limit
        };
    }
}
