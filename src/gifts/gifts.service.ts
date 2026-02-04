import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGiftDto, UpdateGiftDto, GiftResponseDto } from './dto/gift.dto';

import { CacheService } from '../shared/cache.service';
import { RedisService } from '../shared/redis.service';
import { randomUUID } from 'crypto';

@Injectable()
export class GiftsService {
    private readonly logger = new Logger(GiftsService.name);

    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
        private redis: RedisService
    ) { }

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

        // Cache the list of ALL available gifts (stock > 0)
        // We filter in-memory to avoid generating infinite cache keys based on category combinations
        const gifts = await this.cache.getOrSet(
            'gifts:available',
            300, // 5 mins
            async () => {
                return await this.prisma.giftSKU.findMany({
                    where: {
                        stock: { gt: 0 },
                    },
                });
            }
        );

        // Filter gifts based on eligible categories
        const eligibleGifts = gifts.filter((gift) => {
            // If no eligible categories specified, gift is available for all
            if (!gift.eligibleCategories || (Array.isArray(gift.eligibleCategories) && gift.eligibleCategories.length === 0)) {
                return true;
            }

            // Check if any cart category matches gift's eligible categories
            const eligibleCats = Array.isArray(gift.eligibleCategories)
                ? gift.eligibleCategories
                : [];

            return categoryIds.some((catId) => eligibleCats.includes(catId as string));
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
        const cacheKey = `gift:${id}`;

        return await this.cache.getOrSet(
            cacheKey,
            600, // 10 mins
            async () => {
                const gift = await this.prisma.giftSKU.findUnique({
                    where: { id },
                });

                if (!gift) {
                    throw new NotFoundException(`Gift with ID ${id} not found`);
                }

                return this.mapToResponseDto(gift);
            }
        );
    }

    /**
     * Create new gift SKU (admin)
     */
    async createGift(dto: CreateGiftDto): Promise<GiftResponseDto> {
        this.logger.log(`Creating new gift: ${dto.title}`);

        const gift = await this.prisma.giftSKU.create({
            data: {
                id: randomUUID(),
                title: dto.title,
                stock: dto.stock,
                cost: dto.cost,
                eligibleCategories: dto.eligibleCategories || [],
            },
        });

        this.logger.log(`Gift created with ID: ${gift.id}`);

        // Invalidate available gifts list
        await this.cache.del('gifts:available');

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

        // Invalidate specific gift and available list
        await this.cache.del(`gift:${id}`);
        await this.cache.del('gifts:available');

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

        // Invalidate specific gift and available list
        await this.cache.del(`gift:${id}`);
        await this.cache.del('gifts:available');
    }

    /**
     * Validate gift selection
     */
    async validateGiftSelection(giftId: string, categoryIds: string[]): Promise<boolean> {
        // We bypass cache here to ensure stock is strictly correct at checkout
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

        // Invalidate cache
        await this.cache.del(`gift:${giftId}`);
        await this.cache.del('gifts:available');
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
     * Reserve gift stock (Redis)
     */
    async reserveGift(giftId: string) {
        const key = `reservation:gift:${giftId}`;
        const gift = await this.getGiftById(giftId);

        if (gift.stock <= 0) {
            throw new BadRequestException('Gift out of stock');
        }

        const reservedStr = await this.redis.get(key);
        const reserved = parseInt(reservedStr || '0', 10);

        if (gift.stock - reserved <= 0) {
            throw new BadRequestException('Gift out of stock (Reserved)');
        }

        const newReserved = await this.redis.incrBy(key, 1);
        if (newReserved > gift.stock) {
            await this.redis.decrBy(key, 1);
            throw new BadRequestException('Gift out of stock');
        }
        await this.redis.expire(key, 900); // 15 mins
        return true;
    }

    async releaseGift(giftId: string) {
        const key = `reservation:gift:${giftId}`;
        const newReserved = await this.redis.decrBy(key, 1);
        if (newReserved <= 0) {
            await this.redis.del(key);
        }
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
