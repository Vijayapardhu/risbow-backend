import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminRoomsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query() query: { page?: number; limit?: number; status?: string; search?: string }) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search } }
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.room.count({ where }),
      this.prisma.room.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          _count: { select: { members: true } },
          createdBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    };
  }

  @Get('stats')
  async getStats() {
    const [total, active, locked, unlocked, completed, totalMembers] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { status: 'ACTIVE' } }),
      this.prisma.room.count({ where: { status: 'LOCKED' } }),
      this.prisma.room.count({ where: { status: 'UNLOCKED' } }),
      this.prisma.room.count({ where: { status: 'COMPLETED' } }),
      this.prisma.roomMember.count()
    ]);

    return { total, byStatus: { active, locked, unlocked, completed }, totalMembers };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, mobile: true } } }
        },
        createdBy: { select: { id: true, name: true } },
        product: { select: { id: true, title: true, price: true } }
      }
    });

    if (!room) throw new Error('Room not found');
    return room;
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.prisma.roomMember.findMany({
      where: { roomId: id },
      include: { user: { select: { id: true, name: true, mobile: true } } }
    });
  }

  @Get(':id/orders')
  async getOrders(@Param('id') id: string) {
    return this.prisma.order.findMany({
      where: { roomId: id },
      include: { user: { select: { id: true, name: true } } }
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.prisma.room.update({
      where: { id },
      data: dto
    });
  }

  @Post(':id/close')
  async closeRoom(@Param('id') id: string) {
    return this.prisma.room.update({
      where: { id },
      data: { status: 'EXPIRED' }
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prisma.room.delete({ where: { id } });
    return { message: 'Room deleted successfully' };
  }

  // Weekly Offers
  @Get('weekly-offers')
  async getWeeklyOffers() {
    return this.prisma.weeklyOffer.findMany({ orderBy: { startAt: 'desc' } });
  }

  @Post('weekly-offers')
  @HttpCode(HttpStatus.CREATED)
  async createWeeklyOffer(@Body() dto: { name: string; startAt: string; endAt: string; rules?: any }) {
    return this.prisma.weeklyOffer.create({
      data: {
        name: dto.name,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        rules: dto.rules || {}
      }
    });
  }

  @Patch('weekly-offers/:id')
  async updateWeeklyOffer(@Param('id') id: string, @Body() dto: any) {
    return this.prisma.weeklyOffer.update({
      where: { id },
      data: dto
    });
  }
}
