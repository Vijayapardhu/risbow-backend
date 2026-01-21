import { PrismaService } from '../prisma/prisma.service';
import { CreateGiftDto, UpdateGiftDto, GiftResponseDto } from './dto/gift.dto';
export declare class GiftsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getAllGifts(): Promise<GiftResponseDto[]>;
    getEligibleGifts(categoryIds: string[]): Promise<GiftResponseDto[]>;
    getGiftById(id: string): Promise<GiftResponseDto>;
    createGift(dto: CreateGiftDto): Promise<GiftResponseDto>;
    updateGift(id: string, dto: UpdateGiftDto): Promise<GiftResponseDto>;
    deleteGift(id: string): Promise<void>;
    validateGiftSelection(giftId: string, categoryIds: string[]): Promise<boolean>;
    decrementGiftStock(giftId: string): Promise<void>;
    getInventoryReport(): Promise<{
        totalGifts: number;
        outOfStock: number;
        lowStock: number;
        gifts: GiftResponseDto[];
    }>;
    private mapToResponseDto;
}
