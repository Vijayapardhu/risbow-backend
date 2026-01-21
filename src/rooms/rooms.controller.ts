import { Controller, Post, Body, Param, UseGuards, Request, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service'; // Direct access for simple GET

import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
    constructor(
        private readonly roomsService: RoomsService,
        private readonly prisma: PrismaService
    ) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Request() req, @Body() createRoomDto: CreateRoomDto) {
        return this.roomsService.create(req.user.id, createRoomDto);
    }

    @Post(':id/join')
    @UseGuards(JwtAuthGuard)
    join(@Request() req, @Param('id') id: string) {
        return this.roomsService.join(id, req.user.id);
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

    @Get()
    findAll(@Query('status') status: RoomStatus) {
        // Simple filter
        const where = status ? { status } : {};
        return this.prisma.room.findMany({
            where,
            include: {
                members: true, // simple include, prod would aggregate 
                createdBy: { select: { name: true } },
                _count: {
                    select: { members: true }
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
            include: { members: true }
        })
    }
}
