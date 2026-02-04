import { Controller, Post, Body, Param, UseGuards, Request, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomMonetizationService } from './room-monetization.service';
import { BowRoomIntelligenceService } from '../bow/bow-room-intelligence.service';
import { CreateRoomDto, CreateDiscountRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoomStatus, RoomBoostType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service'; // Direct access for simple GET

import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
    constructor(
        private readonly roomsService: RoomsService,
        private readonly monetizationService: RoomMonetizationService,
        private readonly bowIntelligence: BowRoomIntelligenceService,
        private readonly prisma: PrismaService
    ) { }

    @Get(':id/progress')
    async getProgress(@Param('id') id: string) {
        return this.roomsService.getRoomProgress(id);
    }

    @Get(':id/countdown')
    async getCountdown(@Param('id') id: string) {
        return this.roomsService.getRoomCountdown(id);
    }

    @Post(':id/boost')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
    async purchaseBoost(
        @Param('id') id: string,
        @Request() req,
        @Body() dto: { type: RoomBoostType, coinsCost: number, durationMinutes: number }
    ) {
        return this.monetizationService.purchaseRoomBoost(req.user.id, {
            roomId: id,
            ...dto,
            vendorId: req.user.role === 'VENDOR' ? req.user.id : undefined
        });
    }

    @Get(':id/probability')
    async getProbability(@Param('id') id: string) {
        return { probability: await this.bowIntelligence.calculateUnlockProbability(id) };
    }

    @Post(':id/nudge')
    @UseGuards(JwtAuthGuard)
    async triggerNudge(@Param('id') id: string, @Request() req) {
        return this.bowIntelligence.generateRoomNudge(id, req.user.id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Request() req, @Body() dto: any) {
        if (dto.productId && dto.maxDiscount) {
            return this.roomsService.createDiscountRoom(req.user.id, dto as CreateDiscountRoomDto);
        }
        return this.roomsService.create(req.user.id, dto as CreateRoomDto);
    }

    @Post(':id/join')
    @UseGuards(JwtAuthGuard)
    async join(@Request() req, @Param('id') id: string) {
        const room = await this.prisma.room.findUnique({ where: { id } });
        if (room?.type === 'LINEAR_DISCOUNT') {
            return this.roomsService.joinDiscountRoom(id, req.user.id);
        }
        return this.roomsService.join(id, req.user.id);
    }

    @Post(':id/leave')
    @UseGuards(JwtAuthGuard)
    async leave(@Request() req, @Param('id') id: string) {
        return this.roomsService.leaveDiscountRoom(id, req.user.id);
    }

    @Post(':id/purchase')
    @UseGuards(JwtAuthGuard)
    async purchase(@Request() req, @Param('id') id: string) {
        // This Locks the room and returns the final calculated discount
        // Logic for applying discount to checkout happens in Orders/Cart service which would call RoomsService.initiatePurchase
        return this.roomsService.initiatePurchase(id, req.user.id);
    }

    @Post(':id/order/:orderId')
    @UseGuards(JwtAuthGuard)
    async linkOrder(
        @Param('id') roomId: string,
        @Param('orderId') orderId: string,
        @Request() req
    ) {
        return this.roomsService.linkOrder(roomId, req.user.id, orderId);
    }

    @Post(':id/unlock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async forceUnlock(@Param('id') id: string) {
        return this.roomsService.forceUnlock(id);
    }

    @Post(':id/expire')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async expireRoom(@Param('id') id: string) {
        return this.roomsService.expireRoom(id);
    }

    @Get(':id/activity')
    async getActivity(
        @Param('id') id: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        return this.roomsService.getFeed(id, page ? Number(page) : 1, limit ? Number(limit) : 20);
    }

    @Get()
    findAll(@Query('status') status: RoomStatus) {
        // Simple filter
        const where = status ? { status } : {};
        return this.prisma.room.findMany({
            where,
            include: {
                RoomMember: true, // simple include, prod would aggregate 
                _count: {
                    select: { RoomMember: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.prisma.room.findUnique({
            where: { id },
            include: { RoomMember: true }
        })
    }
}
