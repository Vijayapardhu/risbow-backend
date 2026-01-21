export declare class BannerMetadataDto {
    slotKey: string;
    slotIndex: number;
    priority?: number;
    isPaid?: boolean;
    analytics?: {
        impressions?: number;
        clicks?: number;
    };
}
export declare class CreateBannerDto {
    imageUrl: string;
    redirectUrl?: string;
    slotType: string;
    startDate: string;
    endDate: string;
    slotKey: string;
    slotIndex: number;
    priority?: number;
    isActive?: boolean;
}
export declare class UpdateBannerDto {
    imageUrl?: string;
    redirectUrl?: string;
    endDate?: string;
    slotIndex?: number;
    priority?: number;
    isActive?: boolean;
}
export declare class PurchaseBannerDto {
    slotType: string;
    slotKey: string;
    slotIndex: number;
    durationDays: number;
}
export declare class UploadBannerCreativeDto {
    bannerId: string;
    imageUrl: string;
    redirectUrl?: string;
}
export declare class TrackBannerDto {
    event: string;
}
export declare class BannerResponseDto {
    id: string;
    vendorId?: string;
    imageUrl: string;
    redirectUrl?: string;
    slotType: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    metadata: BannerMetadataDto;
    createdAt: Date;
}
export declare class GetActiveBannersQueryDto {
    slotType: string;
    slotKey?: string;
}
