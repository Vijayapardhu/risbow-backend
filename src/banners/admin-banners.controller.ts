import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

class AdminBannerQueryDto {
  page?: number;
  limit?: number;
  status?: string;
  vendorId?: string;
  slotType?: string;
  dateRange?: string;
}

class ApproveBannerDto {
  notes?: string;
}

class RejectBannerDto {
  reason: string;
}

@ApiTags('Admin - Banners')
@Controller('admin/banners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminBannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all banners with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'EXPIRED'] })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'slotType', required: false })
  async findAll(@Query() query: AdminBannerQueryDto) {
    const { page = 1, limit = 10, status, vendorId, slotType } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      if (status === 'ACTIVE') where.isActive = true;
      else if (status === 'INACTIVE') where.isActive = false;
      else if (status === 'PENDING') {
        where.isActive = false;
        where.vendorId = { not: null };
      }
      else if (status === 'EXPIRED') {
        where.endDate = { lt: new Date() };
      }
    }
    if (vendorId) where.vendorId = vendorId;
    if (slotType) where.slotType = slotType;

    const [total, data] = await Promise.all([
      this.prisma.banner.count({ where }),
      this.prisma.banner.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Get analytics for each banner
    const bannersWithAnalytics = await Promise.all(
      data.map(async (banner) => {
        const impressions = await this.prisma.bannerImpressionLedger.count({
          where: { bannerId: banner.id },
        });
        const clicks = await this.prisma.bannerImpressionLedger.count({
          where: { bannerId: banner.id, clickedAt: { not: null } },
        });
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

        return {
          ...banner,
          analytics: { impressions, clicks, ctr: ctr.toFixed(2) },
        };
      }),
    );

    return {
      data: bannersWithAnalytics,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get banner analytics dashboard' })
  async getAnalytics() {
    const [
      totalBanners,
      activeBanners,
      pendingApproval,
      totalImpressions,
      totalClicks,
      vendorBanners,
      systemBanners,
    ] = await Promise.all([
      this.prisma.banner.count(),
      this.prisma.banner.count({ where: { isActive: true, endDate: { gte: new Date() } } }),
      this.prisma.banner.count({ where: { isActive: false, vendorId: { not: null } } }),
      this.prisma.bannerImpressionLedger.count(),
      this.prisma.bannerImpressionLedger.count({ where: { clickedAt: { not: null } } }),
      this.prisma.banner.count({ where: { vendorId: { not: null } } }),
      this.prisma.banner.count({ where: { vendorId: null } }),
    ]);

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Get top performing banners
    const topBanners = await this.prisma.banner.findMany({
      where: { isActive: true },
      take: 5,
      include: {
        _count: { select: { BannerImpressionLedger: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get slot availability
    const slotTypes = ['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART'];
    const slotAvailability = await Promise.all(
      slotTypes.map(async (slotType) => {
        const activeInSlot = await this.prisma.banner.count({
          where: {
            slotType,
            isActive: true,
            endDate: { gte: new Date() },
          },
        });
        return { slotType, activeCount: activeInSlot, available: activeInSlot < 5 };
      }),
    );

    return {
      overview: {
        totalBanners,
        activeBanners,
        pendingApproval,
        vendorBanners,
        systemBanners,
      },
      performance: {
        totalImpressions,
        totalClicks,
        ctr: ctr.toFixed(2),
      },
      topBanners,
      slotAvailability,
    };
  }

  @Get('slots/availability')
  @ApiOperation({ summary: 'Check slot availability' })
  async getSlotAvailability() {
    const slotTypes = ['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART'];
    const availability = await Promise.all(
      slotTypes.map(async (slotType) => {
        const banners = await this.prisma.banner.findMany({
          where: {
            slotType,
            isActive: true,
            endDate: { gte: new Date() },
          },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            vendorId: true,
          },
        });

        return {
          slotType,
          totalSlots: 5,
          occupiedSlots: banners.length,
          availableSlots: Math.max(0, 5 - banners.length),
          banners,
        };
      }),
    );

    return { availability };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get banner by ID' })
  async findOne(@Param('id') id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new Error('Banner not found');
    }

    // Get detailed analytics
    const impressions = await this.prisma.bannerImpressionLedger.count({
      where: { bannerId: id },
    });
    const clicks = await this.prisma.bannerImpressionLedger.count({
      where: { bannerId: id, clickedAt: { not: null } },
    });

    // Get daily stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await this.prisma.bannerImpressionLedger.groupBy({
      by: ['viewedAt'],
      where: {
        bannerId: id,
        viewedAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    return {
      ...banner,
      analytics: {
        impressions,
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0,
        dailyStats,
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create system banner (Admin)' })
  async create(@Body() dto: any) {
    const banner = await this.prisma.banner.create({
      data: {
        id: randomUUID(),
        title: dto.title || 'Banner',
        imageUrl: dto.imageUrl,
        mobileImageUrl: dto.mobileImageUrl || null,
        linkUrl: dto.linkUrl || null,
        redirectUrl: dto.redirectUrl || null,
        slot: dto.slot || 'HOME_TOP',
        slotType: dto.slotType,
        device: dto.device || 'ALL',
        priority: dto.priority || 1,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        metadata: dto.metadata || null,
      },
    });

    return banner;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update banner' })
  async update(@Param('id') id: string, @Body() dto: any) {
    const updateData: any = {};
    
    if (dto.imageUrl) updateData.imageUrl = dto.imageUrl;
    if (dto.redirectUrl !== undefined) updateData.redirectUrl = dto.redirectUrl;
    if (dto.slotType) updateData.slotType = dto.slotType;
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;

    const banner = await this.prisma.banner.update({
      where: { id },
      data: updateData,
    });

    return banner;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete banner' })
  async remove(@Param('id') id: string) {
    await this.prisma.banner.delete({ where: { id } });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve vendor banner' })
  async approve(@Param('id') id: string, @Body() dto: ApproveBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    
    if (!banner) {
      throw new Error('Banner not found');
    }

    if (!banner.vendorId) {
      throw new Error('System banners do not require approval');
    }

    const updatedBanner = await this.prisma.banner.update({
      where: { id },
      data: {
        isActive: true,
        metadata: {
          approvedAt: new Date().toISOString(),
          approvalNotes: dto.notes || null,
        },
      },
    });

    return updatedBanner;
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject vendor banner' })
  async reject(@Param('id') id: string, @Body() dto: RejectBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    
    if (!banner) {
      throw new Error('Banner not found');
    }

    if (!banner.vendorId) {
      throw new Error('Cannot reject system banners');
    }

    const updatedBanner = await this.prisma.banner.update({
      where: { id },
      data: {
        isActive: false,
        metadata: {
          rejectedAt: new Date().toISOString(),
          rejectionReason: dto.reason,
        },
      },
    });

    return updatedBanner;
  }

  @Get(':id/redemptions')
  @ApiOperation({ summary: 'Get banner impression ledger' })
  async getRedemptions(
    @Param('id') id: string,
    @Query() query: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.bannerImpressionLedger.count({ where: { bannerId: id } }),
      this.prisma.bannerImpressionLedger.findMany({
        where: { bannerId: id },
        skip,
        take: Number(limit),
        include: {
          User: { select: { id: true, name: true } },
        },
        orderBy: { viewedAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
