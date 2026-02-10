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
}
