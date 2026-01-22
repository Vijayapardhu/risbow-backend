import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus, MemberStatus, OrderStatus } from '@prisma/client';
import { RoomsGateway } from './rooms.gateway';
import { RedisService } from '../shared/redis.service'; // Fix path to match shared module

@Injectable()
export class RoomsService {
    constructor(
        private prisma: PrismaService,
        private roomsGateway: RoomsGateway,
        private redis: RedisService,
    ) { }


    async create(userId: string, dto: CreateRoomDto) {
        // SRS 1.6: Check active offer window
        const activeOffer = await this.prisma.weeklyOffer.findFirst({
            where: {
                isActive: true,
                endAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!activeOffer) {
            throw new BadRequestException('No active Weekly Offer available to start a room. Please wait for the next drop!');
        }

        const room = await this.prisma.room.create({
            data: {
                name: dto.name,
                size: dto.size,
                unlockMinOrders: dto.unlockMinOrders,
                unlockMinValue: dto.unlockMinValue,
                offerId: activeOffer.id,
                createdById: userId,
                isSystemRoom: false,
                startAt: new Date(),
                // End at 7 days or Offer End, whichever is sooner? usually 7 days for room
                endAt: activeOffer.endAt,
                members: {
                    create: {
                        userId,
                        status: MemberStatus.PENDING,
                    },
                },
            },
            include: {
                members: true,
            },
        });

        return room;
    }

    async join(roomId: string, userId: string) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: { members: true },
        });

        if (!room) throw new NotFoundException('Room not found');
        if (room.status !== RoomStatus.LOCKED && room.status !== RoomStatus.ACTIVE) {
            throw new ForbiddenException('Room is not active or locked');
        }
        if (room.members.length >= room.size) {
            throw new ForbiddenException('Room is full');
        }

        const existing = room.members.find(m => m.userId === userId);
        if (existing) return { message: 'Already joined', member: existing };

        const member = await this.prisma.roomMember.create({
            data: {
                roomId,
                userId,
                status: MemberStatus.PENDING,
            },
        });

        // Notify others via WebSocket
        this.roomsGateway.server.to(roomId).emit('room_update', {
            type: 'MEMBER_JOINED',
            userId,
            count: room.members.length + 1,
        });

        return member;
    }

    async checkUnlockStatus(roomId: string) {
        // Robust Check: Count distinct users who ordered? Or Orders?

        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.status === 'UNLOCKED' || room.status === 'EXPIRED') return;

        const stats = await this.prisma.order.aggregate({
            where: {
                roomId,
                status: { in: ['CONFIRMED', 'DELIVERED', 'SHIPPED', 'PACKED'] }
            },
            _count: { id: true },
            _sum: { totalAmount: true }
        });

        const orderedCount = stats._count.id;
        const totalOrderValue = stats._sum.totalAmount || 0;

        // Unlock Condition
        if (orderedCount >= room.unlockMinOrders && totalOrderValue >= room.unlockMinValue) {
            // UNLOCK
            await this.prisma.room.update({
                where: { id: roomId },
                data: { status: 'UNLOCKED' }
            });

            const message = `Congratulation! Room unlocked with ${orderedCount} orders and ₹${totalOrderValue} value!`;
            await this.addActivity(roomId, 'UNLOCK', message);
        } else {
            // Progress update?
        }

        return { orderedCount, totalOrderValue, unlocked: orderedCount >= room.unlockMinOrders && totalOrderValue >= room.unlockMinValue };
    }

    async linkOrder(roomId: string, userId: string, orderId: string) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: { members: true }
        });
        if (!room) throw new NotFoundException('Room not found');

        const member = room.members.find(m => m.userId === userId);
        if (!member) throw new ForbiddenException('You are not a member of this room');

        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== userId) throw new ForbiddenException('Order does not belong to you');
        if (order.roomId) throw new BadRequestException('Order already linked to a room');

        // Update Order
        await this.prisma.order.update({
            where: { id: orderId },
            data: { roomId }
        });

        // Update Member Status
        await this.prisma.roomMember.update({
            where: { roomId_userId: { roomId, userId } },
            data: { status: MemberStatus.ORDERED }
        });

        // Check Unlock
        await this.checkUnlockStatus(roomId);

        return { message: 'Order linked successfully' };
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

        return updated;
    }

    async expireRoom(roomId: string) {
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room) throw new NotFoundException('Room not found');

        const updated = await this.prisma.room.update({
            where: { id: roomId },
            data: { status: RoomStatus.EXPIRED }
        });

        this.roomsGateway.server.to(roomId).emit('room_update', {
            type: 'EXPIRED',
            status: RoomStatus.EXPIRED,
            forced: true
        });

        return updated;
    }

    // Activity Feed (Redis)
    async addActivity(roomId: string, type: string, message: string, meta?: any) {
        const key = `room:feed:${roomId}`;
        const activity = {
            id: Date.now().toString(),
            type,
            message,
            timestamp: new Date().toISOString(),
            meta
        };
        // LPush to Keep latest first
        await this.redis.lpush(key, JSON.stringify(activity));
        // Trim to keep last 50
        await this.redis.ltrim(key, 0, 49);
    }

    async getFeed(roomId: string) {
        const key = `room:feed:${roomId}`;
        const items = await this.redis.lrange(key, 0, -1);
        return items.map(i => JSON.parse(i));
    }
}
