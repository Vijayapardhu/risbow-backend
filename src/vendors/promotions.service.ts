import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentIntentPurpose } from '@prisma/client';

@Injectable()
export class PromotionsService {
    private readonly logger = new Logger(PromotionsService.name);

    constructor(
        private prisma: PrismaService,
        private paymentsService: PaymentsService
    ) { }

    /**
     * Books a banner slot for a vendor.
     * Uses PaymentIntent with purpose VENDOR_MEMBERSHIP / BANNER_SLOT.
     */
    async bookBannerSlot(vendorId: string, params: {
        imageUrl: string;
        targetUrl?: string;
        startDate: Date;
        endDate: Date;
        pricePaise: number;
    }) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        // Create the banner in INACTIVE state
        const banner = await this.prisma.banner.create({
            data: {
                Vendor: { connect: { id: vendorId } },
                title: 'Vendor Promotion Banner',
                imageUrl: params.imageUrl,
                redirectUrl: params.targetUrl, // Match schema redirectUrl
                slotType: 'HOME_BANNER', // Required in schema
                startDate: params.startDate,
                endDate: params.endDate,
                isActive: false, // Only active after payment
                metadata: {
                    pricePaise: params.pricePaise,
                }
            } as any
        });

        // Generate Payment Intent
        const payment = await this.paymentsService.createPaymentIntent({
            userId: undefined, // Vendor context (could be vendor user ID)
            purpose: PaymentIntentPurpose.BANNER_SLOT,
            referenceId: banner.id,
            amount: params.pricePaise,
            metadata: { bannerId: banner.id, vendorId }
        });

        return {
            bannerId: banner.id,
            payment
        };
    }

    /**
     * Activates a promotion after successful payment verification.
     * Called by webhook or verifyPayment handler.
     */
    async activatePromotion(referenceId: string, purpose: PaymentIntentPurpose) {
        if (purpose === PaymentIntentPurpose.BANNER_SLOT) {
            await this.prisma.banner.update({
                where: { id: referenceId },
                data: { isActive: true }
            });
            this.logger.log(`Banner ${referenceId} activated after payment.`);
        }
    }

    /**
     * Gets active promotions for specific slots.
     */
    async getActiveBanners() {
        return this.prisma.banner.findMany({
            where: {
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Campaign methods
    async getAvailableCampaigns(vendorId: string) {
        // Return available campaigns (admin-defined campaigns vendors can enroll in)
        const campaigns = await this.prisma.bannerCampaign.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return { campaigns };
    }

    async getVendorEnrollments(vendorId: string) {
        // Get vendor's enrolled campaigns
        const banners = await this.prisma.banner.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' }
        });
        return { enrollments: banners };
    }

    async getCampaignById(id: string) {
        return this.prisma.bannerCampaign.findUnique({ where: { id } });
    }

    async getCampaignProducts(id: string) {
        // Get products in a campaign
        return [];
    }

    async enrollInCampaign(vendorId: string, campaignId: string, dto: any) {
        const banner = await this.prisma.banner.create({
            data: {
                vendorId,
                title: dto.title || 'Campaign Banner',
                imageUrl: dto.imageUrl,
                redirectUrl: dto.targetUrl,
                slotType: dto.slotType || 'HOME_BANNER',
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                isActive: false,
            }
        });
        return { enrollment: banner };
    }

    async leaveCampaign(vendorId: string, campaignId: string) {
        await this.prisma.banner.deleteMany({
            where: { id: campaignId, vendorId }
        });
        return { message: 'Left campaign successfully' };
    }

    async updateCampaignProduct(vendorId: string, campaignId: string, productId: string, dto: any) {
        return { message: 'Product updated', campaignId, productId, ...dto };
    }

    async removeCampaignProduct(vendorId: string, campaignId: string, productId: string) {
        return { message: 'Product removed from campaign', campaignId, productId };
    }
}
