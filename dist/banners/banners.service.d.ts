import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto, UpdateBannerDto, PurchaseBannerDto, UploadBannerCreativeDto, BannerResponseDto } from './dto/banner.dto';
import { CacheService } from '../shared/cache.service';
import { QueuesService } from '../queues/queues.service';
export declare class BannersService {
    private prisma;
    private cache;
    private queues;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService, queues: QueuesService);
    getActiveBanners(slotType: string, slotKey?: string): Promise<BannerResponseDto[]>;
    getAllBanners(): Promise<BannerResponseDto[]>;
    getBannerById(id: string): Promise<BannerResponseDto>;
    createBanner(dto: CreateBannerDto): Promise<BannerResponseDto>;
    updateBanner(id: string, dto: UpdateBannerDto): Promise<BannerResponseDto>;
    deleteBanner(id: string): Promise<void>;
    purchaseBannerSlot(vendorId: string, dto: PurchaseBannerDto): Promise<BannerResponseDto>;
    uploadBannerCreative(vendorId: string, dto: UploadBannerCreativeDto): Promise<BannerResponseDto>;
    approveBanner(id: string): Promise<BannerResponseDto>;
    trackBannerEvent(id: string, event: string): Promise<void>;
    getBannerAnalytics(id: string): Promise<{
        bannerId: string;
        slotType: string;
        slotKey: string;
        impressions: number;
        clicks: number;
        ctr: number;
    }>;
    getVendorBanners(vendorId: string): Promise<BannerResponseDto[]>;
    private calculateCTR;
    private parseMetadata;
    private mapToResponseDto;
}
