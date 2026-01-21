export declare class CreateGiftDto {
    title: string;
    stock: number;
    cost: number;
    eligibleCategories?: string[];
}
export declare class UpdateGiftDto {
    title?: string;
    stock?: number;
    cost?: number;
    eligibleCategories?: string[];
}
export declare class SelectGiftDto {
    giftId: string;
}
export declare class GiftResponseDto {
    id: string;
    title: string;
    stock: number;
    cost: number;
    eligibleCategories: string[];
    isEligible?: boolean;
    createdAt: Date;
}
export declare class EligibleGiftsQueryDto {
    categories?: string;
}
