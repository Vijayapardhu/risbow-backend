import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGiftDto, UpdateGiftDto, GiftResponseDto } from './dto/gift.dto';

@Injectable()
export class GiftsService {
    private readonly logger = new Logger(GiftsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get all gift SKUs (admin)
     */
    async getAllGifts(): Promise<GiftResponseDto[]> {
        const gifts = await this.prisma.giftSKU.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return gifts.map((gift) => this.mapToResponseDto(gift));
    }

    /**
     * Get eligible gifts based on cart categories
     */
    async getEligibleGifts(categoryIds: string[]): Promise<GiftResponseDto[]> {
        this.logger.log(`Checking eligible gifts for categories: ${categoryIds.join(', ')}`);

        // Get all gifts with stock > 0
        const gifts = await this.prisma.giftSKU.findMany({
            where: {
                stock: { gt: 0 },
            },
        });

        // Filter gifts based on eligible categories
        const eligibleGifts = gifts.filter((gift) => {
            // If no eligible categories specified, gift is available for all
            if (!gift.eligibleCategories || Array.isArray(gift.eligibleCategories) && gift.eligibleCategories.length === 0) {
                return true;
            }

            // Check if any cart category matches gift's eligible categories
            const eligibleCats = Array.isArray(gift.eligibleCategories)
                ? gift.eligibleCategories
                : [];

            return categoryIds.some((catId) => eligibleCats.includes(catId));
        });

        this.logger.log(`Found ${eligibleGifts.length} eligible gifts`);

        return eligibleGifts.map((gift) => ({
            ...this.mapToResponseDto(gift),
            isEligible: true,
        }));
    }

    /**
     * Get gift by ID
     */
    async getGiftById(id: string): Promise<GiftResponseDto> {
        const gift = await this.prisma.giftSKU.findUnique({
            where: { id },
        });

        if (!gift) {
            throw new NotFoundException(`Gift with ID ${id} not found`);
        }

        return this.mapToResponseDto(gift);
    }

    /**
     * Create new gift SKU (admin)
     */
    async createGift(dto: CreateGiftDto): Promise<GiftResponseDto> {
        this.logger.log(`Creating new gift: ${dto.title}`);

        const gift = await this.prisma.giftSKU.create({
            data: {
                title: dto.title,
                stock: dto.stock,
                cost: dto.cost,
                eligibleCategories: dto.eligibleCategories || [],
            },
        });

        this.logger.log(`Gift created with ID: ${gift.id}`);
        return this.mapToResponseDto(gift);
    }

    /**
     * Update gift SKU (admin)
     */
    async updateGift(id: string, dto: UpdateGiftDto): Promise<GiftResponseDto> {
        // Check if gift exists
        await this.getGiftById(id);

        this.logger.log(`Updating gift: ${id}`);

        const gift = await this.prisma.giftSKU.update({
            where: { id },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.stock !== undefined && { stock: dto.stock }),
                ...(dto.cost !== undefined && { cost: dto.cost }),
                ...(dto.eligibleCategories && { eligibleCategories: dto.eligibleCategories }),
            },
        });

        return this.mapToResponseDto(gift);
    }

    /**
     * Delete gift SKU (admin)
     */
    async deleteGift(id: string): Promise<void> {
        // Check if gift exists
        await this.getGiftById(id);

        this.logger.log(`Deleting gift: ${id}`);

        await this.prisma.giftSKU.delete({
            where: { id },
        });
    }

    /**
     * Validate gift selection
     */
    async validateGiftSelection(giftId: string, categoryIds: string[]): Promise<boolean> {
        const gift = await this.prisma.giftSKU.findUnique({
            where: { id: giftId },
        });

        if (!gift) {
            throw new NotFoundException(`Gift with ID ${giftId} not found`);
        }

        // Check stock
        if (gift.stock <= 0) {
            throw new BadRequestException('Selected gift is out of stock');
        }

        // Check eligibility
        if (gift.eligibleCategories && Array.isArray(gift.eligibleCategories) && gift.eligibleCategories.length > 0) {
            const eligibleCats = gift.eligibleCategories as string[];
            const isEligible = categoryIds.some((catId) => eligibleCats.includes(catId));

            if (!isEligible) {
                throw new BadRequestException('Selected gift is not eligible for your cart categories');
            }
        }

        return true;
    }

    /**
     * Decrement gift stock (called after order confirmation)
     */
    async decrementGiftStock(giftId: string): Promise<void> {
        this.logger.log(`Decrementing stock for gift: ${giftId}`);

        const gift = await this.prisma.giftSKU.findUnique({
            where: { id: giftId },
        });

        if (!gift) {
            this.logger.warn(`Gift ${giftId} not found, skipping stock decrement`);
            return;
        }

        if (gift.stock <= 0) {
            this.logger.warn(`Gift ${giftId} already has zero stock`);
            return;
        }

        await this.prisma.giftSKU.update({
            where: { id: giftId },
            data: {
                stock: { decrement: 1 },
            },
        });

        this.logger.log(`Gift stock decremented successfully`);
    }

    /**
     * Get inventory report (admin)
     */
    async getInventoryReport() {
        const gifts = await this.prisma.giftSKU.findMany({
            orderBy: { stock: 'asc' },
        });

        const totalGifts = gifts.length;
        const outOfStock = gifts.filter((g) => g.stock === 0).length;
        const lowStock = gifts.filter((g) => g.stock > 0 && g.stock <= 10).length;

        return {
            totalGifts,
            outOfStock,
            lowStock,
            gifts: gifts.map((gift) => this.mapToResponseDto(gift)),
        };
    }

    /**
     * Map database model to response DTO
     */
    private mapToResponseDto(gift: any): GiftResponseDto {
        return {
            id: gift.id,
            title: gift.title,
            stock: gift.stock,
            cost: gift.cost,
            eligibleCategories: Array.isArray(gift.eligibleCategories)
                ? gift.eligibleCategories
                : [],
            createdAt: gift.createdAt,
        };
    }
}
