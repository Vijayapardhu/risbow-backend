"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const rooms_gateway_1 = require("./rooms.gateway");
let RoomsService = class RoomsService {
    constructor(prisma, roomsGateway) {
        this.prisma = prisma;
        this.roomsGateway = roomsGateway;
    }
    async create(userId, dto) {
        const activeOffer = await this.prisma.weeklyOffer.findFirst({
            where: {
                isActive: true,
                endAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (!activeOffer) {
            throw new common_1.BadRequestException('No active Weekly Offer available to start a room. Please wait for the next drop!');
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
                endAt: activeOffer.endAt,
                members: {
                    create: {
                        userId,
                        status: client_1.MemberStatus.PENDING,
                    },
                },
            },
            include: {
                members: true,
            },
        });
        return room;
    }
    async join(roomId, userId) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: { members: true },
        });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        if (room.status !== client_1.RoomStatus.LOCKED && room.status !== client_1.RoomStatus.ACTIVE) {
            throw new common_1.ForbiddenException('Room is not active or locked');
        }
        if (room.members.length >= room.size) {
            throw new common_1.ForbiddenException('Room is full');
        }
        const existing = room.members.find(m => m.userId === userId);
        if (existing)
            return { message: 'Already joined', member: existing };
        const member = await this.prisma.roomMember.create({
            data: {
                roomId,
                userId,
                status: client_1.MemberStatus.PENDING,
            },
        });
        this.roomsGateway.server.to(roomId).emit('room_update', {
            type: 'MEMBER_JOINED',
            userId,
            count: room.members.length + 1,
        });
        return member;
    }
    async checkUnlockStatus(roomId) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: { members: true },
        });
        if (!room)
            return;
        const orderedMembers = room.members.filter(m => m.status === client_1.MemberStatus.ORDERED || m.status === client_1.MemberStatus.CONFIRMED);
        const orderedCount = orderedMembers.length;
        const orders = await this.prisma.order.findMany({
            where: { roomId, status: { in: [client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.SHIPPED, client_1.OrderStatus.DELIVERED] } }
        });
        const totalOrderValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        if (orderedCount >= room.unlockMinOrders && totalOrderValue >= room.unlockMinValue) {
            await this.prisma.room.update({
                where: { id: roomId },
                data: { status: client_1.RoomStatus.UNLOCKED },
            });
            this.roomsGateway.server.to(roomId).emit('room_update', {
                type: 'UNLOCKED',
                status: client_1.RoomStatus.UNLOCKED,
            });
        }
        else {
            this.roomsGateway.server.to(roomId).emit('room_update', {
                type: 'PROGRESS',
                ordered: orderedCount,
                neededOrders: room.unlockMinOrders,
                currentValue: totalOrderValue,
                neededValue: room.unlockMinValue
            });
        }
    }
    async linkOrder(roomId, userId, orderId) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: { members: true }
        });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        const member = room.members.find(m => m.userId === userId);
        if (!member)
            throw new common_1.ForbiddenException('You are not a member of this room');
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.userId !== userId)
            throw new common_1.ForbiddenException('Order does not belong to you');
        if (order.roomId)
            throw new common_1.BadRequestException('Order already linked to a room');
        await this.prisma.order.update({
            where: { id: orderId },
            data: { roomId }
        });
        await this.prisma.roomMember.update({
            where: { roomId_userId: { roomId, userId } },
            data: { status: client_1.MemberStatus.ORDERED }
        });
        await this.checkUnlockStatus(roomId);
        return { message: 'Order linked successfully' };
    }
    async forceUnlock(roomId) {
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        const updated = await this.prisma.room.update({
            where: { id: roomId },
            data: { status: client_1.RoomStatus.UNLOCKED }
        });
        this.roomsGateway.server.to(roomId).emit('room_update', {
            type: 'UNLOCKED',
            status: client_1.RoomStatus.UNLOCKED,
            forced: true
        });
        return updated;
    }
    async expireRoom(roomId) {
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        const updated = await this.prisma.room.update({
            where: { id: roomId },
            data: { status: client_1.RoomStatus.EXPIRED }
        });
        this.roomsGateway.server.to(roomId).emit('room_update', {
            type: 'EXPIRED',
            status: client_1.RoomStatus.EXPIRED,
            forced: true
        });
        return updated;
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        rooms_gateway_1.RoomsGateway])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map