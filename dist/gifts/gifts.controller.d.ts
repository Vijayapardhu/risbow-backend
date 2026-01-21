import { GiftsService } from './gifts.service';
import { CreateGiftDto, UpdateGiftDto, GiftResponseDto } from './dto/gift.dto';
export declare class GiftsController {
    private readonly giftsService;
    constructor(giftsService: GiftsService);
    getEligibleGifts(categories?: string): Promise<GiftResponseDto[]>;
    getAllGifts(): Promise<GiftResponseDto[]>;
    getInventoryReport(): Promise<{
        totalGifts: number;
        outOfStock: number;
        lowStock: number;
        gifts: GiftResponseDto[];
    }>;
    getGiftById(id: string): Promise<GiftResponseDto>;
    createGift(dto: CreateGiftDto): Promise<GiftResponseDto>;
    updateGift(id: string, dto: UpdateGiftDto): Promise<GiftResponseDto>;
    deleteGift(id: string): Promise<void>;
}
