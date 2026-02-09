import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBannerDto,
  UpdateBannerDto,
  BannerResponseDto,
  BannerQueryDto,
  BannerStatsDto,
} from './dto/admin-banner.dto';

@Injectable()
export class AdminBannersService {
  private readonly logger = new Logger(AdminBannersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all banners with optional filtering
   */
  async findAll(query: BannerQueryDto): Promise<{ data: BannerResponseDto[]; meta: any }> {
    const { page = 1, limit = 10, slot, isActive, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (slot) {
      where.slot = slot;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [total, banners] = await Promise.all([
      this.prisma.banner.count({ where }),
      this.prisma.banner.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
    ]);

    // Get analytics for each banner
    const bannersWithAnalytics = await Promise.all(
      banners.map(async (banner) => {
        const [impressions, clicks] = await Promise.all([
          this.prisma.bannerImpressionLedger.count({
            where: { bannerId: banner.id },
          }),
          this.prisma.bannerImpressionLedger.count({
            where: { bannerId: banner.id, clickedAt: { not: null } },
          }),
        ]);

        return this.mapToResponseDto(banner, impressions, clicks);
      }),
    );

    return {
      data: bannersWithAnalytics,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get banner by ID
   */
  async findOne(id: string): Promise<BannerResponseDto> {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const [impressions, clicks] = await Promise.all([
      this.prisma.bannerImpressionLedger.count({
        where: { bannerId: id },
      }),
      this.prisma.bannerImpressionLedger.count({
        where: { bannerId: id, clickedAt: { not: null } },
      }),
    ]);

    return this.mapToResponseDto(banner, impressions, clicks);
  }

  /**
   * Create a new banner
   */
  async create(dto: CreateBannerDto): Promise<BannerResponseDto> {
    this.logger.log(`Creating banner: ${dto.title}`);

    const banner = await this.prisma.banner.create({
      data: {
        title: dto.title,
        imageUrl: dto.imageUrl,
        mobileImageUrl: dto.mobileImageUrl || null,
        linkUrl: dto.linkUrl || null,
        slot: dto.slot,
        device: dto.device,
        priority: dto.priority || 1,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });

    this.logger.log(`Banner created with ID: ${banner.id}`);
    return this.mapToResponseDto(banner, 0, 0);
  }

  /**
   * Update an existing banner
   */
  async update(id: string, dto: UpdateBannerDto): Promise<BannerResponseDto> {
    const existingBanner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!existingBanner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    this.logger.log(`Updating banner: ${id}`);

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.mobileImageUrl !== undefined) updateData.mobileImageUrl = dto.mobileImageUrl;
    if (dto.linkUrl !== undefined) updateData.linkUrl = dto.linkUrl;
    if (dto.slot !== undefined) updateData.slot = dto.slot;
    if (dto.device !== undefined) updateData.device = dto.device;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;

    const banner = await this.prisma.banner.update({
      where: { id },
      data: updateData,
    });

    const [impressions, clicks] = await Promise.all([
      this.prisma.bannerImpressionLedger.count({
        where: { bannerId: id },
      }),
      this.prisma.bannerImpressionLedger.count({
        where: { bannerId: id, clickedAt: { not: null } },
      }),
    ]);

    this.logger.log(`Banner updated: ${id}`);
    return this.mapToResponseDto(banner, impressions, clicks);
  }

  /**
   * Delete a banner
   */
  async remove(id: string): Promise<void> {
    const existingBanner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!existingBanner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    this.logger.log(`Deleting banner: ${id}`);

    // Delete related impression records first
    await this.prisma.bannerImpressionLedger.deleteMany({
      where: { bannerId: id },
    });

    // Delete the banner
    await this.prisma.banner.delete({
      where: { id },
    });

    this.logger.log(`Banner deleted: ${id}`);
  }

  /**
   * Toggle banner active status
   */
  async toggleStatus(id: string, isActive: boolean): Promise<BannerResponseDto> {
    const existingBanner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!existingBanner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const banner = await this.prisma.banner.update({
      where: { id },
      data: { isActive },
    });

    const [impressions, clicks] = await Promise.all([
      this.prisma.bannerImpressionLedger.count({
        where: { bannerId: id },
      }),
      this.prisma.bannerImpressionLedger.count({
        where: { bannerId: id, clickedAt: { not: null } },
      }),
    ]);

    this.logger.log(`Banner status toggled: ${id}, isActive: ${isActive}`);
    return this.mapToResponseDto(banner, impressions, clicks);
  }

  /**
   * Get banner statistics
   */
  async getStats(): Promise<BannerStatsDto> {
    const [totalBanners, activeBanners, impressionData] = await Promise.all([
      this.prisma.banner.count(),
      this.prisma.banner.count({ where: { isActive: true } }),
      this.prisma.bannerImpressionLedger.findMany({
        select: {
          clickedAt: true,
        },
      }),
    ]);

    const totalImpressions = impressionData.length;
    const totalClicks = impressionData.filter((i) => i.clickedAt !== null).length;

    return {
      totalBanners,
      activeBanners,
      totalClicks,
      totalImpressions,
    };
  }

  /**
   * Map database banner to response DTO
   */
  private mapToResponseDto(
    banner: any,
    impressions: number,
    clicks: number,
  ): BannerResponseDto {
    return {
      id: banner.id,
      title: banner.title,
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl || undefined,
      linkUrl: banner.linkUrl || undefined,
      slot: banner.slot,
      device: banner.device,
      priority: banner.priority,
      isActive: banner.isActive,
      startDate: banner.startDate || undefined,
      endDate: banner.endDate || undefined,
      clicks,
      impressions,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
    };
  }
}
