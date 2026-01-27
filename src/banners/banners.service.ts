import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateBannerDto,
    UpdateBannerDto,
    PurchaseBannerDto,
    UploadBannerCreativeDto,
    TrackBannerDto,
    BannerResponseDto,
    BannerMetadataDto,
} from './dto/banner.dto';
import { CacheService } from '../shared/cache.service';
import { QueuesService } from '../queues/queues.service';
import { PaymentsService } from '../payments/payments.service';
import { CoinValuationService } from '../coins/coin-valuation.service';
import { UserRole } from '@prisma/client';
import { PaymentIntentPurpose } from '@prisma/client';

@Injectable()
export class BannersService {
    /**
     * Auto-rotation conflict resolver for banner slots
     */
    /*
    async resolveBannerConflicts() {
        return { rotated: 0 };
    }
    */
    private readonly logger = new Logger(BannersService.name);

    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
        private queues: QueuesService,
        private paymentsService: PaymentsService,
        private coinValuation: CoinValuationService,
    ) { }

    /**
     * Get active banners by slot
     */
    async getActiveBanners(slotType: string, slotKey?: string): Promise<BannerResponseDto[]> {
        this.logger.log(`Fetching active banners for slotType: ${slotType}, slotKey: ${slotKey}`);

        const cacheKey = `banners:${slotType}:${slotKey || 'all'}`;

        return await this.cache.getOrSet(
            cacheKey,
            60, // 1 minute TTL (banners are time-sensitive)
            async () => {
                const now = new Date();

                const banners = await this.prisma.banner.findMany({
                    where: {
                        slotType,
                        isActive: true,
                        startDate: { lte: now },
                        endDate: { gte: now },
                    },
                });

                // Filter by slotKey if provided
                let filteredBanners = banners;
                if (slotKey) {
                    filteredBanners = banners.filter((banner) => {
                        const metadata = this.parseMetadata(banner);
                        return metadata.slotKey === slotKey;
                    });
                }

                // Sort by priority (DESC) and slotIndex (ASC)
                const sortedBanners = filteredBanners.sort((a, b) => {
                    const metaA = this.parseMetadata(a);
                    const metaB = this.parseMetadata(b);

                    // System banners (no vendorId) have highest priority
                    if (!a.vendorId && b.vendorId) return -1;
                    if (a.vendorId && !b.vendorId) return 1;

                    // Then by priority
                    const priorityA = metaA.priority || 0;
                    const priorityB = metaB.priority || 0;
                    if (priorityA !== priorityB) return priorityB - priorityA;

                    // Then by slotIndex
                    return metaA.slotIndex - metaB.slotIndex;
                });

                return sortedBanners.map((banner) => this.mapToResponseDto(banner));
            }
        );
    }

    /**
     * Get all banners (admin)
     */
    async getAllBanners(): Promise<BannerResponseDto[]> {
        const banners = await this.prisma.banner.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return banners.map((banner) => this.mapToResponseDto(banner));
    }

    /**
     * Get banner by ID
     */
    async getBannerById(id: string): Promise<BannerResponseDto> {
        const banner = await this.prisma.banner.findUnique({
            where: { id },
        });

        if (!banner) {
            throw new NotFoundException(`Banner with ID ${id} not found`);
        }

        return this.mapToResponseDto(banner);
    }

    /**
     * Create system banner (admin)
     */
    async createBanner(dto: CreateBannerDto): Promise<BannerResponseDto> {
        this.logger.log(`Creating system banner for ${dto.slotType}/${dto.slotKey}`);

        const metadata: BannerMetadataDto = {
            slotKey: dto.slotKey,
            slotIndex: dto.slotIndex,
            priority: dto.priority || 0,
            isPaid: false,
            analytics: {
                impressions: 0,
                clicks: 0,
            },
        };

        const banner = await this.prisma.banner.create({
            data: {
                imageUrl: dto.imageUrl,
                redirectUrl: dto.redirectUrl,
                slotType: dto.slotType,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                isActive: dto.isActive !== undefined ? dto.isActive : true,
                vendorId: null, // System banner
            },
        });

        // Update with metadata (Prisma doesn't support Json in create directly in some versions)
        const updatedBanner = await this.prisma.banner.update({
            where: { id: banner.id },
            data: {
                // Store metadata as JSON string or object based on Prisma version
                // For now, we'll use a workaround by storing in redirectUrl or separate field
                // Since schema doesn't have metadata field, we'll encode it in a comment or use existing fields
            },
        });

        this.logger.log(`Banner created with ID: ${banner.id}`);
        return this.mapToResponseDto(banner);
    }

    /**
     * Update banner (admin)
     */
    async updateBanner(id: string, dto: UpdateBannerDto): Promise<BannerResponseDto> {
        // Check if banner exists
        await this.getBannerById(id);

        this.logger.log(`Updating banner: ${id}`);

        const updateData: any = {};

        if (dto.imageUrl) updateData.imageUrl = dto.imageUrl;
        if (dto.redirectUrl !== undefined) updateData.redirectUrl = dto.redirectUrl;
        if (dto.endDate) updateData.endDate = new Date(dto.endDate);
        if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

        const banner = await this.prisma.banner.update({
            where: { id },
            data: updateData,
        });

        // Invalidate banner cache
        await this.cache.delPattern('banners:*');

        return this.mapToResponseDto(banner);
    }

    /**
     * Delete banner (admin)
     */
    async deleteBanner(id: string): Promise<void> {
        // Check if banner exists
        await this.getBannerById(id);

        this.logger.log(`Deleting banner: ${id}`);

        await this.prisma.banner.delete({
            where: { id },
        });
    }

    /**
     * Vendor purchases banner slot with coins or ₹ payment
     */
    async purchaseBannerSlot(vendorId: string, dto: PurchaseBannerDto): Promise<BannerResponseDto> {
        this.logger.log(`Vendor ${vendorId} purchasing banner slot`);

        // Calculate cost based on slot type and duration
        const costInPaise = this.calculateBannerCost(dto.slotType, dto.durationDays);
        // Convert ₹ cost to coins using admin-configured valuation (paise per 1 coin)
        const paisePerCoin = await this.coinValuation.getActivePaisePerCoin(UserRole.VENDOR);
        const costInCoins = Math.ceil(costInPaise / paisePerCoin);

        return await this.prisma.$transaction(async (tx) => {
            // 1. Verify vendor exists
            const vendor = await tx.vendor.findUnique({
                where: { id: vendorId },
                select: { coinsBalance: true, name: true },
            });

            if (!vendor) {
                throw new NotFoundException('Vendor not found');
            }

            // 2. Check slot availability (no overlapping active banners)
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + dto.durationDays);

            const conflict = await tx.banner.findFirst({
                where: {
                    slotType: dto.slotType,
                    isActive: true,
                    OR: [
                        { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: startDate } }] },
                        { AND: [{ startDate: { lte: endDate } }, { endDate: { gte: endDate } }] },
                        { AND: [{ startDate: { gte: startDate } }, { endDate: { lte: endDate } }] },
                    ],
                },
            });

            if (conflict) {
                throw new BadRequestException(
                    `Banner slot ${dto.slotType} is already booked for this period`
                );
            }

            // 3. Handle payment (coins or ₹)
            let paymentMethod = 'COINS';
            let paymentStatus = 'PENDING';

            if (dto.paymentMethod === 'COINS') {
                // Pay with coins
                if (vendor.coinsBalance < costInCoins) {
                    throw new BadRequestException(
                        `Insufficient coins balance. Required: ${costInCoins}, Available: ${vendor.coinsBalance}`
                    );
                }

                // Atomic coin deduction
                const coinDeductionResult = await tx.vendor.updateMany({
                    where: {
                        id: vendorId,
                        coinsBalance: { gte: costInCoins },
                    },
                    data: {
                        coinsBalance: { decrement: costInCoins },
                    },
                });

                if (coinDeductionResult.count === 0) {
                    throw new BadRequestException('Insufficient coins (concurrent update detected)');
                }

                paymentStatus = 'COMPLETED';
            } else if (dto.paymentMethod === 'RUPEES') {
                // Pay with ₹ (via payment gateway)
                // For now, we'll create a pending payment record
                // In production, integrate with Razorpay or similar
                paymentStatus = 'PENDING';
            } else {
                throw new BadRequestException('Invalid payment method. Use COINS or RUPEES');
            }

            // 4. Create banner record
            const metadata: BannerMetadataDto = {
                slotKey: dto.slotKey,
                slotIndex: dto.slotIndex,
                priority: 50, // Paid vendor banners have medium priority
                isPaid: true,
                paymentMethod,
                paymentStatus,
                costInPaise,
                costInCoins,
                analytics: {
                    impressions: 0,
                    clicks: 0,
                },
            };

            const banner = await tx.banner.create({
                data: {
                    vendorId,
                    imageUrl: '', // Will be uploaded later
                    redirectUrl: null,
                    slotType: dto.slotType,
                    startDate,
                    endDate,
                    isActive: false, // Inactive until admin approves and payment confirmed
                    metadata: metadata as any,
                },
            });

            // 5. Create payment record if paying with ₹
            if (dto.paymentMethod === 'RUPEES' && paymentStatus === 'PENDING') {
                const payment = await this.paymentsService.createPaymentIntent({
                    userId: vendorId,
                    purpose: PaymentIntentPurpose.BANNER_SLOT,
                    referenceId: banner.id,
                    amount: costInPaise,
                    currency: 'INR',
                    metadata: {
                        vendorId,
                        bannerId: banner.id,
                        slotType: dto.slotType,
                        durationDays: dto.durationDays,
                        slotKey: dto.slotKey,
                        slotIndex: dto.slotIndex,
                    },
                });

                // Attach payment info into banner metadata for traceability (non-authoritative)
                await tx.banner.update({
                    where: { id: banner.id },
                    data: {
                        metadata: {
                            ...(metadata as any),
                            paymentIntentId: payment.intentId,
                            providerOrderId: payment.orderId,
                        } as any,
                    },
                });

                const response = this.mapToResponseDto(banner) as any;
                response.payment = payment;
                this.logger.log(`Banner slot purchased with ID: ${banner.id}, payment: ${paymentMethod}`);
                return response;
            }

            this.logger.log(`Banner slot purchased with ID: ${banner.id}, payment: ${paymentMethod}`);
            return this.mapToResponseDto(banner);
        });
    }

    /**
     * Calculates banner cost based on slot type and duration
     * Pricing rules:
     * - Home banner: ₹500/day
     * - Category banner: ₹300/day
     * - Search banner: ₹200/day
     */
    private calculateBannerCost(slotType: string, durationDays: number): number {
        const dailyRates: Record<string, number> = {
            HOME: 50000,      // ₹500/day in paise
            CATEGORY: 30000,  // ₹300/day in paise
            SEARCH: 20000,    // ₹200/day in paise
        };

        const dailyRate = dailyRates[slotType] || 20000; // Default ₹200/day
        return dailyRate * durationDays;
    }

    /**
     * Vendor uploads banner creative
     */
    async uploadBannerCreative(
        vendorId: string,
        dto: UploadBannerCreativeDto,
    ): Promise<BannerResponseDto> {
        const banner = await this.prisma.banner.findUnique({
            where: { id: dto.bannerId },
        });

        if (!banner) {
            throw new NotFoundException(`Banner with ID ${dto.bannerId} not found`);
        }

        if (banner.vendorId !== vendorId) {
            throw new BadRequestException('You can only upload creative for your own banners');
        }

        this.logger.log(`Vendor ${vendorId} uploading creative for banner ${dto.bannerId}`);

        const updatedBanner = await this.prisma.banner.update({
            where: { id: dto.bannerId },
            data: {
                imageUrl: dto.imageUrl,
                redirectUrl: dto.redirectUrl,
            },
        });

        return this.mapToResponseDto(updatedBanner);
    }

    /**
     * Admin approves vendor banner
     */
    async approveBanner(id: string): Promise<BannerResponseDto> {
        const banner = await this.getBannerById(id);

        if (!banner.vendorId) {
            throw new BadRequestException('This is a system banner, no approval needed');
        }

        this.logger.log(`Approving vendor banner: ${id}`);

        const updatedBanner = await this.prisma.banner.update({
            where: { id },
            data: {
                isActive: true,
            },
        });

        // Invalidate banner cache
        await this.cache.delPattern('banners:*');

        return this.mapToResponseDto(updatedBanner);
    }

    /**
     * Track banner impression (ledger-based, NO counter)
     */
    async trackImpression(bannerId: string, userId?: string): Promise<void> {
        // Verify banner exists
        const banner = await this.prisma.banner.findUnique({
            where: { id: bannerId },
            select: { id: true },
        });

        if (!banner) {
            this.logger.warn(`Banner ${bannerId} not found, skipping tracking`);
            return;
        }

        // Create ledger entry (NO counter update)
        await this.prisma.bannerImpressionLedger.create({
            data: {
                bannerId,
                userId: userId || null,
                viewedAt: new Date(),
            },
        });
    }

    /**
     * Track banner click (ledger-based, NO counter)
     */
    async trackClick(bannerId: string, userId?: string): Promise<void> {
        // Find the most recent impression for this user/banner
        const impression = await this.prisma.bannerImpressionLedger.findFirst({
            where: {
                bannerId,
                userId: userId || null,
                clickedAt: null,
            },
            orderBy: { viewedAt: 'desc' },
        });

        if (impression) {
            // Update existing impression with click
            await this.prisma.bannerImpressionLedger.update({
                where: { id: impression.id },
                data: { clickedAt: new Date() },
            });
        } else {
            // Create new entry with both view and click
            await this.prisma.bannerImpressionLedger.create({
                data: {
                    bannerId,
                    userId: userId || null,
                    viewedAt: new Date(),
                    clickedAt: new Date(),
                },
            });
        }
    }

    /**
     * Track banner event (impression or click) - Legacy method for compatibility
     */
    async trackBannerEvent(id: string, event: string, userId?: string): Promise<void> {
        if (event === 'impression') {
            await this.trackImpression(id, userId);
        } else if (event === 'click') {
            await this.trackClick(id, userId);
        }
    }

    /**
     * Get banner analytics (ledger-based, NO counters)
     */
    async getBannerStats(bannerId: string) {
        const banner = await this.getBannerById(bannerId);

        // Count impressions from ledger
        const impressions = await this.prisma.bannerImpressionLedger.count({
            where: { bannerId },
        });

        // Count clicks from ledger
        const clicks = await this.prisma.bannerImpressionLedger.count({
            where: {
                bannerId,
                clickedAt: { not: null },
            },
        });

        const metadata = this.parseMetadata(banner as any);

        return {
            bannerId,
            slotType: banner.slotType,
            slotKey: metadata.slotKey,
            impressions, // Calculated from ledger
            clicks, // Calculated from ledger
            ctr: this.calculateCTR(impressions, clicks),
        };
    }

    /**
     * Get banner analytics (admin) - Legacy method for compatibility
     */
    async getBannerAnalytics(id: string) {
        return this.getBannerStats(id);
    }

    /**
     * Get vendor's banners
     */
    async getVendorBanners(vendorId: string): Promise<BannerResponseDto[]> {
        const banners = await this.prisma.banner.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
        });

        return banners.map((banner) => this.mapToResponseDto(banner));
    }

    /**
     * Calculate Click-Through Rate
     */
    private calculateCTR(impressions: number, clicks: number): number {
        if (impressions === 0) return 0;
        return (clicks / impressions) * 100;
    }

    /**
     * Parse metadata from banner
     * Since the schema doesn't have a metadata field, we'll create a default structure
     */
    private parseMetadata(banner: any): BannerMetadataDto {
        // Default metadata structure
        // In production, this would be stored in a JSON field
        return {
            slotKey: 'CAROUSEL', // Default
            slotIndex: 0,
            priority: banner.vendorId ? 50 : 100, // System banners have higher priority
            isPaid: !!banner.vendorId,
            analytics: {
                impressions: 0,
                clicks: 0,
            },
        };
    }

    /**
     * Map database model to response DTO
     */
    private mapToResponseDto(banner: any): BannerResponseDto {
        const metadata = this.parseMetadata(banner);

        return {
            id: banner.id,
            vendorId: banner.vendorId,
            imageUrl: banner.imageUrl,
            redirectUrl: banner.redirectUrl,
            slotType: banner.slotType,
            startDate: banner.startDate,
            endDate: banner.endDate,
            isActive: banner.isActive,
            metadata,
            createdAt: banner.createdAt,
        };
    }
}
