import { BannersService } from './banners.service';
import { CreateBannerDto, UpdateBannerDto, PurchaseBannerDto, UploadBannerCreativeDto, TrackBannerDto, BannerResponseDto } from './dto/banner.dto';
export declare class BannersController {
    private readonly bannersService;
    constructor(bannersService: BannersService);
    getActiveBanners(slotType: string, slotKey?: string): Promise<BannerResponseDto[]>;
    trackBannerEvent(id: string, dto: TrackBannerDto): Promise<{
        message: string;
    }>;
    getAllBanners(): Promise<BannerResponseDto[]>;
    getBannerById(id: string): Promise<BannerResponseDto>;
    createBanner(dto: CreateBannerDto): Promise<BannerResponseDto>;
    updateBanner(id: string, dto: UpdateBannerDto): Promise<BannerResponseDto>;
    deleteBanner(id: string): Promise<void>;
    approveBanner(id: string): Promise<BannerResponseDto>;
    getBannerAnalytics(id: string): Promise<{
        bannerId: string;
        slotType: string;
        slotKey: string;
        impressions: number;
        clicks: number;
        ctr: number;
    }>;
    purchaseBannerSlot(req: any, dto: PurchaseBannerDto): Promise<BannerResponseDto>;
    uploadBannerCreative(req: any, dto: UploadBannerCreativeDto): Promise<BannerResponseDto>;
    getVendorBanners(req: any): Promise<BannerResponseDto[]>;
}
