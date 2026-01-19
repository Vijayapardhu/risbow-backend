import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus, MemberStatus, OrderStatus } from '@prisma/client';
import { RoomsGateway } from './rooms.gateway';

@Injectable()
export class RoomsService {
    constructor(
        private prisma: PrismaService,
        private roomsGateway: RoomsGateway,
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
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: { members: true },
        });

        if (!room) return;

        // SRS 1.6: Weekly Offer Logic - check if room is in valid window
        // const offer = ...; if (now > offer.endAt) return; // Expired 

        // Logic: Count members with ORDERED status
        // Note: In real app, we need to link Orders to Rooms to calculate total value.
        // For now, assuming MemberStatus.ORDERED implies they met criteria.

        // This is a simplified check. Real check would query Orders table aggregating value.
        const orderedMembers = room.members.filter(m => m.status === MemberStatus.ORDERED || m.status === MemberStatus.CONFIRMED);
        const orderedCount = orderedMembers.length;

        // Calculate Total Value
        const orders = await this.prisma.order.findMany({
            where: { roomId, status: { in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } }
        });
        const totalOrderValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

        if (orderedCount >= room.unlockMinOrders && totalOrderValue >= room.unlockMinValue) {
            await this.prisma.room.update({
                where: { id: roomId },
                data: { status: RoomStatus.UNLOCKED },
            });

            this.roomsGateway.server.to(roomId).emit('room_update', {
                type: 'UNLOCKED',
                status: RoomStatus.UNLOCKED,
            });
        } else {
            // Send progress update
            this.roomsGateway.server.to(roomId).emit('room_update', {
                type: 'PROGRESS',
                ordered: orderedCount,
                neededOrders: room.unlockMinOrders,
                currentValue: totalOrderValue,
                neededValue: room.unlockMinValue
            });
        }
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
}
