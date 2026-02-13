import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateCampaignDto, UpdateCampaignDto, CampaignFilterDto, CampaignStatus, DiscountType } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new campaign
   */
  async createCampaign(dto: CreateCampaignDto, createdBy?: string) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validate dates
    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate discount value for percentage type
    if (dto.discountType === DiscountType.PERCENTAGE && dto.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    // Validate limited stock
    if (dto.limitedStock && !dto.totalStock) {
      throw new BadRequestException('Total stock is required when limited stock is enabled');
    }

    // Determine initial status
    const now = new Date();
    let status = CampaignStatus.SCHEDULED;
    if (startDate <= now && endDate > now) {
      status = CampaignStatus.ACTIVE;
    } else if (endDate <= now) {
      status = CampaignStatus.ENDED;
    }

    // Create campaign with products
    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        startDate,
        endDate,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscount: dto.maxDiscount,
        minOrderValue: dto.minOrderValue,
        limitedStock: dto.limitedStock || false,
        totalStock: dto.totalStock,
        priority: dto.priority || 0,
        status,
        targetAudience: dto.targetAudience,
        bannerImage: dto.bannerImage,
        termsConditions: dto.termsConditions,
        createdBy,
        CampaignProduct: {
          create: dto.products.map((p) => ({
            productId: p.productId,
            customDiscount: p.customDiscount,
            stockAllocated: p.stockAllocated,
          })),
        },
      },
      include: {
        CampaignProduct: {
          include: {
            Product: {
              select: {
                id: true,
                title: true,
                price: true,
                offerPrice: true,
                images: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Campaign created: ${campaign.id} - ${campaign.name} (Status: ${status})`);

    return campaign;
  }

  /**
   * Get all campaigns with filters
   */
  async getCampaigns(filters: CampaignFilterDto) {
    const { status, type, isActive, search, page = 1, limit = 20 } = filters;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          CampaignProduct: {
            include: {
              Product: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                  offerPrice: true,
                  images: true,
                  stock: true,
                },
              },
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // Active campaigns first
          { startDate: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      campaigns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        CampaignProduct: {
          include: {
            Product: {
              select: {
                id: true,
                title: true,
                price: true,
                offerPrice: true,
                images: true,
                stock: true,
                vendorId: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.getCampaignById(id);

    // Prevent updating active or ended campaigns
    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot update active campaign. Pause it first.');
    }

    if (campaign.status === CampaignStatus.ENDED) {
      throw new BadRequestException('Cannot update ended campaign');
    }

    // Validate dates if provided
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : campaign.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : campaign.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Validate discount value for percentage type
    if (dto.discountType === DiscountType.PERCENTAGE && dto.discountValue && dto.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    // Update campaign
    const updateData: any = {
      name: dto.name,
      description: dto.description,
      type: dto.type,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscount: dto.maxDiscount,
      minOrderValue: dto.minOrderValue,
      limitedStock: dto.limitedStock,
      totalStock: dto.totalStock,
      priority: dto.priority,
      targetAudience: dto.targetAudience,
      bannerImage: dto.bannerImage,
      termsConditions: dto.termsConditions,
    };

    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }

    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        CampaignProduct: {
          include: {
            Product: {
              select: {
                id: true,
                title: true,
                price: true,
                offerPrice: true,
                images: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    // Update products if provided
    if (dto.products && dto.products.length > 0) {
      // Delete existing products
      await this.prisma.campaignProduct.deleteMany({
        where: { campaignId: id },
      });

      // Add new products
      await this.prisma.campaignProduct.createMany({
        data: dto.products.map((p) => ({
          campaignId: id,
          productId: p.productId,
          customDiscount: p.customDiscount,
          stockAllocated: p.stockAllocated,
        })),
      });
    }

    this.logger.log(`Campaign updated: ${id}`);

    return this.getCampaignById(id);
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active campaign. End it first.');
    }

    await this.prisma.campaign.delete({
      where: { id },
    });

    this.logger.log(`Campaign deleted: ${id}`);

    return { message: 'Campaign deleted successfully' };
  }

  /**
   * Activate campaign manually
   */
  async activateCampaign(id: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is already active');
    }

    if (campaign.status === CampaignStatus.ENDED) {
      throw new BadRequestException('Cannot activate ended campaign');
    }

    const now = new Date();
    if (campaign.endDate <= now) {
      throw new BadRequestException('Cannot activate campaign with past end date');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE },
      include: {
        CampaignProduct: {
          include: {
            Product: true,
          },
        },
      },
    });

    this.logger.log(`Campaign activated: ${id}`);

    return updated;
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(id: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Only active campaigns can be paused');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });

    this.logger.log(`Campaign paused: ${id}`);

    return updated;
  }

  /**
   * End campaign manually
   */
  async endCampaign(id: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status === CampaignStatus.ENDED) {
      throw new BadRequestException('Campaign is already ended');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ENDED },
    });

    this.logger.log(`Campaign ended: ${id}`);

    return updated;
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(id: string) {
    const campaign = await this.getCampaignById(id);

    // Calculate click-through rate
    const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;

    // Calculate conversion rate
    const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;

    // Calculate average order value
    const avgOrderValue = campaign.conversions > 0 ? campaign.revenue / campaign.conversions : 0;

    // Calculate ROI (simplified - would need campaign cost in real scenario)
    const estimatedCost = 0; // Would come from banner pricing or marketing spend
    const roi = estimatedCost > 0 ? ((campaign.revenue - estimatedCost) / estimatedCost) * 100 : 0;

    // Get stock status
    const stockStatus = campaign.limitedStock
      ? {
          total: campaign.totalStock,
          used: campaign.usedStock,
          remaining: (campaign.totalStock || 0) - campaign.usedStock,
          percentageUsed: campaign.totalStock
            ? ((campaign.usedStock / campaign.totalStock) * 100).toFixed(2)
            : 0,
        }
      : null;

    // Time remaining
    const now = new Date();
    const timeRemaining = campaign.endDate > now ? campaign.endDate.getTime() - now.getTime() : 0;
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        type: campaign.type,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      },
      metrics: {
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        revenue: campaign.revenue,
        ctr: Number(ctr.toFixed(2)),
        conversionRate: Number(conversionRate.toFixed(2)),
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        roi: Number(roi.toFixed(2)),
      },
      stockStatus,
      timeRemaining: {
        hours: hoursRemaining,
        minutes: minutesRemaining,
        milliseconds: timeRemaining,
      },
      products: campaign.CampaignProduct.map((cp) => ({
        id: cp.Product.id,
        title: cp.Product.title,
        stockAllocated: cp.stockAllocated,
        stockUsed: cp.stockUsed,
        stockRemaining: (cp.stockAllocated || 0) - cp.stockUsed,
      })),
    };
  }

  /**
   * Get active campaigns (public endpoint)
   */
  async getActiveCampaigns() {
    const now = new Date();

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.ACTIVE,
        isActive: true,
        startDate: { lte: now },
        endDate: { gt: now },
      },
      include: {
        CampaignProduct: {
          where: {
            isActive: true,
          },
          include: {
            Product: {
              select: {
                id: true,
                title: true,
                price: true,
                offerPrice: true,
                images: true,
                stock: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        priority: 'desc',
      },
    });

    return campaigns;
  }

  /**
   * Calculate discounted price for a product in a campaign
   */
  calculateDiscountedPrice(
    originalPrice: number,
    discountType: string,
    discountValue: number,
    maxDiscount?: number,
  ): number {
    if (discountType === DiscountType.PERCENTAGE) {
      const discountAmount = (originalPrice * discountValue) / 100;
      const actualDiscount = maxDiscount ? Math.min(discountAmount, maxDiscount) : discountAmount;
      return Math.max(0, originalPrice - actualDiscount);
    } else {
      // FIXED discount
      return Math.max(0, originalPrice - discountValue);
    }
  }

  /**
   * Check if product is in any active campaign
   */
  async getProductCampaignDiscount(productId: string) {
    const now = new Date();

    const campaignProducts = await this.prisma.campaignProduct.findMany({
      where: {
        productId,
        isActive: true,
        Campaign: {
          status: CampaignStatus.ACTIVE,
          isActive: true,
          startDate: { lte: now },
          endDate: { gt: now },
        },
      },
      include: {
        Campaign: true,
      },
      orderBy: {
        Campaign: {
          priority: 'desc',
        },
      },
      take: 1, // Get highest priority campaign
    });

    if (campaignProducts.length === 0) {
      return null;
    }

    const cp = campaignProducts[0];
    const campaign = cp.Campaign;

    // Use custom discount if set, otherwise use campaign discount
    const discountValue = cp.customDiscount ?? campaign.discountValue;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      discountType: campaign.discountType,
      discountValue,
      maxDiscount: campaign.maxDiscount,
      endDate: campaign.endDate,
    };
  }

  /**
   * Increment campaign impression count
   */
  async incrementImpression(campaignId: string) {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        impressions: { increment: 1 },
      },
    });
  }

  /**
   * Increment campaign click count
   */
  async incrementClick(campaignId: string) {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        clicks: { increment: 1 },
      },
    });
  }

  /**
   * Record campaign conversion
   */
  async recordConversion(campaignId: string, orderValue: number) {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        conversions: { increment: 1 },
        revenue: { increment: orderValue },
      },
    });
  }

  /**
   * Cron job to auto-activate scheduled campaigns
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoActivateCampaigns() {
    const now = new Date();

    const campaignsToActivate = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        isActive: true,
        startDate: { lte: now },
        endDate: { gt: now },
      },
    });

    if (campaignsToActivate.length > 0) {
      await this.prisma.campaign.updateMany({
        where: {
          id: { in: campaignsToActivate.map((c) => c.id) },
        },
        data: {
          status: CampaignStatus.ACTIVE,
        },
      });

      this.logger.log(`Auto-activated ${campaignsToActivate.length} campaigns`);
    }
  }

  /**
   * Cron job to auto-end expired campaigns
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoEndCampaigns() {
    const now = new Date();

    const campaignsToEnd = await this.prisma.campaign.findMany({
      where: {
        status: { in: [CampaignStatus.ACTIVE, CampaignStatus.SCHEDULED] },
        endDate: { lte: now },
      },
    });

    if (campaignsToEnd.length > 0) {
      await this.prisma.campaign.updateMany({
        where: {
          id: { in: campaignsToEnd.map((c) => c.id) },
        },
        data: {
          status: CampaignStatus.ENDED,
        },
      });

      this.logger.log(`Auto-ended ${campaignsToEnd.length} campaigns`);
    }
  }
}
