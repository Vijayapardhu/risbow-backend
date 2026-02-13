import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerCampaignDto } from './dto/create-banner-campaign.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class BannerCampaignsService {
  private readonly logger = new Logger(BannerCampaignsService.name);

  constructor(private prisma: PrismaService) {}

  async createCampaign(vendorId: string, bannerId: string, dto: CreateBannerCampaignDto) {
    // Verify banner exists and belongs to vendor
    const banner = await this.prisma.banner.findUnique({
      where: { id: bannerId },
      select: { id: true, vendorId: true },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    if (banner.vendorId !== vendorId) {
      throw new BadRequestException('Banner does not belong to this vendor');
    }

    // Check if campaign already exists for this banner
    const existingCampaign = await this.prisma.bannerCampaign.findFirst({
      where: { bannerId },
    });

    if (existingCampaign) {
      throw new BadRequestException('Campaign already exists for this banner');
    }

    // Create campaign
    const campaignId = randomUUID();
    await this.prisma.bannerCampaign.create({
      data: {
        id: campaignId,
        bannerId,
        vendorId,
        campaignType: dto.campaignType,
        targetAudience: dto.targetAudience,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        amountPaid: dto.amountPaid,
        paymentStatus: 'PAID', // Assuming payment is processed before campaign creation
      },
    });

    // Fetch campaign with relations
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
      include: {
        Banner: {
          select: {
            id: true,
            imageUrl: true,
            slotType: true,
            redirectUrl: true,
          },
        },
        Vendor: {
          select: {
            id: true,
            name: true,
            storeName: true,
          },
        },
      },
    } as any);

    if (!campaign) {
      throw new NotFoundException('Campaign not found after creation');
    }
    this.logger.log(`Banner campaign ${campaign.id} created for vendor ${vendorId}`);
    return campaign;
  }

  async getCampaignById(campaignId: string) {
    const campaign = await this.prisma.bannerCampaign.findUnique({
      where: { id: campaignId },
      include: {
        Banner: true,
        Vendor: {
          select: {
            id: true,
            name: true,
            storeName: true,
          },
        },
      },
    } as any);

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async getVendorCampaigns(vendorId: string) {
    return this.prisma.bannerCampaign.findMany({
      where: { vendorId },
      include: {
        Banner: {
          select: {
            id: true,
            imageUrl: true,
            slotType: true,
            redirectUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    } as any);
  }

  async getCampaignStats(campaignId: string) {
    const campaign = await this.getCampaignById(campaignId);

    const impressionsCount = await this.prisma.bannerImpressionLedger.count({
      where: { bannerId: campaign.bannerId },
    });

    const clicksCount = await this.prisma.bannerImpressionLedger.count({
      where: {
        bannerId: campaign.bannerId,
        clickedAt: { not: null },
      },
    });

    const ctr = impressionsCount > 0 ? (clicksCount / impressionsCount) * 100 : 0;

    return {
      campaignId,
      bannerId: campaign.bannerId,
      impressions: impressionsCount,
      clicks: clicksCount,
      ctr: Number(ctr.toFixed(2)),
      amountPaid: campaign.amountPaid,
      paymentStatus: campaign.paymentStatus,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    };
  }
}
