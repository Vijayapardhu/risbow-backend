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
        private queues: QueuesService
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
     * Vendor purchases banner slot
     */
    async purchaseBannerSlot(vendorId: string, dto: PurchaseBannerDto): Promise<BannerResponseDto> {
        this.logger.log(`Vendor ${vendorId} purchasing banner slot`);

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + dto.durationDays);

        const metadata: BannerMetadataDto = {
            slotKey: dto.slotKey,
            slotIndex: dto.slotIndex,
            priority: 50, // Paid vendor banners have medium priority
            isPaid: true,
            analytics: {
                impressions: 0,
                clicks: 0,
            },
        };

        const banner = await this.prisma.banner.create({
            data: {
                vendorId,
                imageUrl: '', // Will be uploaded later
                redirectUrl: null,
                slotType: dto.slotType,
                startDate,
                endDate,
                isActive: false, // Inactive until admin approves
            },
        });

        this.logger.log(`Banner slot purchased with ID: ${banner.id}`);
        return this.mapToResponseDto(banner);
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
     * Track banner event (impression or click)
     * Now uses background queue for non-blocking analytics
     */
    async trackBannerEvent(id: string, event: string): Promise<void> {
        this.logger.log(`Tracking ${event} for banner ${id}`);

        // Verify banner exists (quick check)
        const banner = await this.prisma.banner.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!banner) {
            this.logger.warn(`Banner ${id} not found, skipping tracking`);
            return;
        }

        // Queue analytics event for background processing
        await this.queues.addBannerAnalytics({
            bannerId: id,
            eventType: event as 'impression' | 'click',
            timestamp: new Date(),
        });

        this.logger.debug(`${event} queued for banner ${id}`);
    }

    /**
     * Get banner analytics (admin)
     */
    async getBannerAnalytics(id: string) {
        const banner = await this.getBannerById(id);

        const metadata = this.parseMetadata(banner as any);

        return {
            bannerId: id,
            slotType: banner.slotType,
            slotKey: metadata.slotKey,
            impressions: metadata.analytics?.impressions || 0,
            clicks: metadata.analytics?.clicks || 0,
            ctr: this.calculateCTR(
                metadata.analytics?.impressions || 0,
                metadata.analytics?.clicks || 0,
            ),
        };
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
