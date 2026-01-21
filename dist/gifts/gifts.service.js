"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GiftsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GiftsService = GiftsService_1 = class GiftsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(GiftsService_1.name);
    }
    async getAllGifts() {
        const gifts = await this.prisma.giftSKU.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return gifts.map((gift) => this.mapToResponseDto(gift));
    }
    async getEligibleGifts(categoryIds) {
        this.logger.log(`Checking eligible gifts for categories: ${categoryIds.join(', ')}`);
        const gifts = await this.prisma.giftSKU.findMany({
            where: {
                stock: { gt: 0 },
            },
        });
        const eligibleGifts = gifts.filter((gift) => {
            if (!gift.eligibleCategories || Array.isArray(gift.eligibleCategories) && gift.eligibleCategories.length === 0) {
                return true;
            }
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
    async getGiftById(id) {
        const gift = await this.prisma.giftSKU.findUnique({
            where: { id },
        });
        if (!gift) {
            throw new common_1.NotFoundException(`Gift with ID ${id} not found`);
        }
        return this.mapToResponseDto(gift);
    }
    async createGift(dto) {
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
    async updateGift(id, dto) {
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
    async deleteGift(id) {
        await this.getGiftById(id);
        this.logger.log(`Deleting gift: ${id}`);
        await this.prisma.giftSKU.delete({
            where: { id },
        });
    }
    async validateGiftSelection(giftId, categoryIds) {
        const gift = await this.prisma.giftSKU.findUnique({
            where: { id: giftId },
        });
        if (!gift) {
            throw new common_1.NotFoundException(`Gift with ID ${giftId} not found`);
        }
        if (gift.stock <= 0) {
            throw new common_1.BadRequestException('Selected gift is out of stock');
        }
        if (gift.eligibleCategories && Array.isArray(gift.eligibleCategories) && gift.eligibleCategories.length > 0) {
            const eligibleCats = gift.eligibleCategories;
            const isEligible = categoryIds.some((catId) => eligibleCats.includes(catId));
            if (!isEligible) {
                throw new common_1.BadRequestException('Selected gift is not eligible for your cart categories');
            }
        }
        return true;
    }
    async decrementGiftStock(giftId) {
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
    mapToResponseDto(gift) {
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
};
exports.GiftsService = GiftsService;
exports.GiftsService = GiftsService = GiftsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GiftsService);
//# sourceMappingURL=gifts.service.js.map