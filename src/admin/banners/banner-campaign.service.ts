import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
} from '@prisma/client';
import { AdminAuditService, AuditActionType, AuditResourceType } from '../audit/admin-audit.service';

// Define enums that don't exist in Prisma schema
enum BannerCampaignStatus {
  PENDING = 'PENDING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  DEACTIVATED = 'DEACTIVATED',
  COMPLETED = 'COMPLETED',
}

enum BannerType {
  STATIC = 'STATIC',
  DYNAMIC = 'DYNAMIC',
  VIDEO = 'VIDEO',
  PROMOTIONAL = 'PROMOTIONAL',
}

// BannerCampaignStatus enum values that exist in schema
// Using Prisma's enum directly


/**
 * Banner positions and their specs
 */
export const BANNER_POSITIONS = {
  HOME_HERO: {
    name: 'Home Page Hero',
    width: 1200,
    height: 400,
    maxFileSize: 2 * 1024 * 1024, // 2MB
  },
  HOME_MIDDLE: {
    name: 'Home Page Middle',
    width: 800,
    height: 300,
    maxFileSize: 1.5 * 1024 * 1024,
  },
  CATEGORY_TOP: {
    name: 'Category Page Top',
    width: 1000,
    height: 250,
    maxFileSize: 1.5 * 1024 * 1024,
  },
  PRODUCT_SIDEBAR: {
    name: 'Product Page Sidebar',
    width: 300,
    height: 600,
    maxFileSize: 1 * 1024 * 1024,
  },
  SEARCH_RESULTS: {
    name: 'Search Results',
    width: 728,
    height: 90,
    maxFileSize: 500 * 1024,
  },
  MOBILE_INTERSTITIAL: {
    name: 'Mobile Interstitial',
    width: 320,
    height: 480,
    maxFileSize: 1 * 1024 * 1024,
  },
};

interface CreateCampaignDto {
  vendorId?: string;
  name: string;
  type: string;
  bannerId?: string;
  position: string;
  imageUrl: string;
  targetUrl: string;
  startDate: Date;
  endDate: Date;
  budget?: number;
  dailyBudget?: number;
  targetAudience?: Record<string, any>;
  categories?: string[];
  priority?: number;
  createdBy: string;
}

interface UpdateCampaignDto {
  name?: string;
  imageUrl?: string;
  targetUrl?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  dailyBudget?: number;
  targetAudience?: Record<string, any>;
  priority?: number;
  updatedBy: string;
}

@Injectable()
export class BannerCampaignService {
  constructor(
    private prisma: PrismaService,
    private auditService: AdminAuditService,
  ) { }

  /**
   * Create a new banner campaign
   */
  async createCampaign(dto: CreateCampaignDto) {
    // Validate position
    if (!BANNER_POSITIONS[dto.position]) {
      throw new BadRequestException(`Invalid banner id: ${dto.position}`);
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (startDate < new Date()) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // Check for conflicting campaigns (same position and overlapping dates)
    const conflicting = await this.prisma.bannerCampaign.findFirst({
      where: {
        position: dto.position,
        status: { in: [BannerCampaignStatus.APPROVED, BannerCampaignStatus.ACTIVE] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (conflicting && dto.type !== BannerType.PROMOTIONAL) {
      throw new ConflictException(
        'Another campaign is already scheduled for this position and time period',
      );
    }

    // Get pricing for the position
    const pricing = await this.prisma.bannerPricing.findFirst({
      where: { position: dto.position, isActive: true },
    });

    // Calculate duration in days
    const durationDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate estimated cost
    let estimatedCost = 0;
    if (pricing) {
      estimatedCost = pricing.pricePerDay * durationDays;
    }

    const campaign = await this.prisma.bannerCampaign.create({
      data: {
        id: `banner_campaign_${Date.now()}`,
        bannerId: dto.bannerId || `banner_${Date.now()}`,
        vendorId: dto.vendorId,
        campaignType: dto.type || 'STANDARD',
        position: dto.position || 'TOP',
        targetAudience: JSON.stringify(dto.targetAudience || {}),
        startDate,
        endDate,
        amountPaid: dto.budget || estimatedCost,
        paymentStatus: 'PENDING',
        status: dto.vendorId ? BannerCampaignStatus.PENDING_APPROVAL : BannerCampaignStatus.APPROVED,
      },
    });

    await this.auditService.log({
      adminId: dto.createdBy,
      action: AuditActionType.BANNER_CREATED,
      resourceType: AuditResourceType.BANNER,
      resourceId: campaign.id,
      details: {
        name: dto.name,
        type: dto.type,
        position: dto.position,
        vendorId: dto.vendorId,
      },
    });

    return campaign;
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === BannerCampaignStatus.EXPIRED) {
      throw new BadRequestException('Cannot update completed campaigns');
    }

    if (campaign.status === BannerCampaignStatus.ACTIVE && dto.startDate) {
      throw new BadRequestException('Cannot change start date of running campaigns');
    }

    const updatedCampaign = await this.prisma.bannerCampaign.update({
      where: { id: campaignId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.imageUrl && { imageUrl: dto.imageUrl }),
        ...(dto.targetUrl && { targetUrl: dto.targetUrl }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.budget && { budget: dto.budget }),
        ...(dto.dailyBudget && { dailyBudget: dto.dailyBudget }),
        ...(dto.targetAudience && { targetAudience: dto.targetAudience }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
      },
    });

    await this.auditService.log({
      adminId: dto.updatedBy,
      action: AuditActionType.BANNER_UPDATED,
      resourceType: AuditResourceType.BANNER,
      resourceId: campaignId,
      oldValues: campaign as any,
      newValues: updatedCampaign as any,
    });

    return updatedCampaign;
  }

  /**
   * Approve campaign
   */
  async approveCampaign(campaignId: string, adminId: string, adminEmail?: string) {
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== BannerCampaignStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only pending campaigns can be approved');
    }

    const updatedCampaign = await this.prisma.bannerCampaign.update({
      where: { id: campaignId },
      data: {
        status: BannerCampaignStatus.APPROVED,
      },
    });

    await this.auditService.log({
      adminId,
      adminEmail,
      action: AuditActionType.BANNER_APPROVED,
      resourceType: AuditResourceType.BANNER,
      resourceId: campaignId,
      details: { campaignId },
    });

    return updatedCampaign;
  }

  /**
   * Reject campaign
   */
  async rejectCampaign(
    campaignId: string,
    reason: string,
    adminId: string,
    adminEmail?: string,
  ) {
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== BannerCampaignStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only pending campaigns can be rejected');
    }

    const updatedCampaign = await this.prisma.bannerCampaign.update({
      where: { id: campaignId },
      data: {
        status: BannerCampaignStatus.REJECTED,
      },
    });

    await this.auditService.log({
      adminId,
      adminEmail,
      action: AuditActionType.BANNER_REJECTED,
      resourceType: AuditResourceType.BANNER,
      resourceId: campaignId,
      details: { campaignId, reason },
    });

    return updatedCampaign;
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string, adminId: string) {
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== BannerCampaignStatus.ACTIVE) {
      throw new BadRequestException('Only running campaigns can be paused');
    }

    return this.prisma.bannerCampaign.update({
      where: { id: campaignId },
      data: { status: BannerCampaignStatus.PAUSED },
    });
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string, adminId: string) {
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== BannerCampaignStatus.PAUSED) {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    // Check if campaign is still within date range
    const now = new Date();
    if (now > campaign.endDate) {
      throw new BadRequestException('Campaign has already expired');
    }

    return this.prisma.bannerCampaign.update({
      where: { id: campaignId },
      data: {
        status: now >= campaign.startDate
          ? BannerCampaignStatus.ACTIVE
          : BannerCampaignStatus.APPROVED,
      },
    });
  }

  /**
   * Cancel campaign
   */
  async cancelCampaign(campaignId: string, adminId: string) {
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === BannerCampaignStatus.EXPIRED) {
      throw new BadRequestException('Cannot cancel completed campaigns');
    }

    return this.prisma.bannerCampaign.update({
      where: { id: campaignId },
      data: { status: BannerCampaignStatus.DEACTIVATED },
    });
  }

  /**
   * Get campaigns with filters
   */
  async getCampaigns(options?: {
    vendorId?: string;
    status?: BannerCampaignStatus;
    type?: string;
    position?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      vendorId,
      status,
      type,
      position,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options || {};

    const where: Prisma.BannerCampaignWhereInput = {};

    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    if (position) where.position = position;

    if (startDate || endDate) {
      if (startDate) where.startDate = { gte: startDate };
      if (endDate) where.endDate = { lte: endDate };
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.bannerCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bannerCampaign.count({ where }),
    ]);

    const vendorIds = Array.from(new Set(campaigns.map((c) => c.vendorId).filter(Boolean)));
    const vendors = vendorIds.length
      ? await this.prisma.vendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, storeName: true },
      })
      : [];
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

    const campaignsWithVendor = campaigns.map((campaign) => ({
      ...campaign,
      Vendor: campaign.vendorId ? vendorMap.get(campaign.vendorId) || null : null,
    }));

    return {
      campaigns: campaignsWithVendor,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending campaigns for approval
   */
  async getPendingCampaigns(page = 1, limit = 20) {
    return this.getCampaigns({
      status: BannerCampaignStatus.PENDING_APPROVAL,
      page,
      limit,
    });
  }

  /**
   * Get active campaigns for a position
   */
  async getActiveCampaignsForPosition(id: string) {
    const now = new Date();

    return this.prisma.bannerCampaign.findMany({
      where: {
        position: id,
        status: BannerCampaignStatus.ACTIVE,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { status: 'desc' },
    });
  }

  /**
   * Record impression
   */
  async recordImpression(campaignId: string) {
    await this.prisma.bannerMetric.upsert({
      where: {
        id: `${campaignId}-${new Date().toISOString().split('T')[0]}`,
      },
      create: {
        id: `${campaignId}-${new Date().toISOString().split('T')[0]}`,
        campaignId,
        date: new Date(new Date().toISOString().split('T')[0]),
        impressions: 1,
        clicks: 0,
        // spent: 0,
      },
      update: {
        impressions: { increment: 1 },
      },
    });
  }

  /**
   * Record click
   */
  async recordClick(campaignId: string) {
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) return;

    const pricing = await this.prisma.bannerPricing.findFirst({
      where: { position: campaign.position, isActive: true },
    });

    const cpcCost = pricing?.pricePerDay || 0;

    await this.prisma.bannerMetric.upsert({
      where: {
        id: `${campaignId}-${new Date().toISOString().split('T')[0]}`,
      },
      create: {
        id: `${campaignId}-${new Date().toISOString().split('T')[0]}`,
        campaignId,
        date: new Date(new Date().toISOString().split('T')[0]),
        impressions: 0,
        clicks: 1,
        // spent: cpcCost,
      },
      update: {
        clicks: { increment: 1 },
        // spent: { increment: cpcCost },
      },
    });

    // Update total spent on campaign
    await this.prisma.bannerCampaign.update({
      where: { id: campaignId },
      data: {},
    });
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string) {
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Calculate aggregate metrics
    const metrics = await this.prisma.bannerMetric.findMany({
      where: { campaignId },
      orderBy: { date: 'asc' },
    });

    const totals = metrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
      }),
      { impressions: 0, clicks: 0 },
    );

    const ctr = totals.impressions > 0
      ? (totals.clicks / totals.impressions) * 100
      : 0;

    const cpc = totals.clicks > 0
      ? 0
      : 0;

    return {
      campaign,
      totals,
      ctr: Math.round(ctr * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      dailyMetrics: metrics,
    };
  }

  /**
   * Start scheduled campaigns (cron job)
   */
  async startScheduledCampaigns() {
    const now = new Date();

    const toStart = await this.prisma.bannerCampaign.findMany({
      where: {
        status: BannerCampaignStatus.APPROVED,
        startDate: { lte: now },
        endDate: { gt: now },
      },
    });

    for (const campaign of toStart) {
      await this.prisma.bannerCampaign.update({
        where: { id: campaign.id },
        data: { status: BannerCampaignStatus.ACTIVE },
      });
    }

    return { started: toStart.length };
  }

  /**
   * Complete expired campaigns (cron job)
   */
  async completeExpiredCampaigns() {
    const now = new Date();

    const toComplete = await this.prisma.bannerCampaign.updateMany({
      where: {
        status: BannerCampaignStatus.ACTIVE,
        endDate: { lte: now },
      },
      data: { status: BannerCampaignStatus.EXPIRED },
    });

    return { completed: toComplete.count };
  }

  /**
   * Get banner positions with specs
   */
  getBannerPositions() {
    return BANNER_POSITIONS;
  }

  /**
   * Manage pricing
   */
  async updatePricing(
    id: string,
    pricePerDay: number,
    cpcRate: number,
    cpmRate: number,
    adminId: string,
  ) {
    if (!BANNER_POSITIONS[id]) {
      throw new BadRequestException(`Invalid id: ${id}`);
    }

    return this.prisma.bannerPricing.upsert({
      where: { id },
      create: {
        position: id,
        duration: 1,
        pricePerDay,
        isActive: true,
      },
      update: {
        pricePerDay,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get all pricing
   */
  async getAllPricing() {
    return this.prisma.bannerPricing.findMany({
      where: { isActive: true },
    });
  }
}


