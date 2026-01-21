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
var BannersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const cache_service_1 = require("../shared/cache.service");
const queues_service_1 = require("../queues/queues.service");
let BannersService = BannersService_1 = class BannersService {
    constructor(prisma, cache, queues) {
        this.prisma = prisma;
        this.cache = cache;
        this.queues = queues;
        this.logger = new common_1.Logger(BannersService_1.name);
    }
    async getActiveBanners(slotType, slotKey) {
        this.logger.log(`Fetching active banners for slotType: ${slotType}, slotKey: ${slotKey}`);
        const cacheKey = `banners:${slotType}:${slotKey || 'all'}`;
        return await this.cache.getOrSet(cacheKey, 60, async () => {
            const now = new Date();
            const banners = await this.prisma.banner.findMany({
                where: {
                    slotType,
                    isActive: true,
                    startDate: { lte: now },
                    endDate: { gte: now },
                },
            });
            let filteredBanners = banners;
            if (slotKey) {
                filteredBanners = banners.filter((banner) => {
                    const metadata = this.parseMetadata(banner);
                    return metadata.slotKey === slotKey;
                });
            }
            const sortedBanners = filteredBanners.sort((a, b) => {
                const metaA = this.parseMetadata(a);
                const metaB = this.parseMetadata(b);
                if (!a.vendorId && b.vendorId)
                    return -1;
                if (a.vendorId && !b.vendorId)
                    return 1;
                const priorityA = metaA.priority || 0;
                const priorityB = metaB.priority || 0;
                if (priorityA !== priorityB)
                    return priorityB - priorityA;
                return metaA.slotIndex - metaB.slotIndex;
            });
            return sortedBanners.map((banner) => this.mapToResponseDto(banner));
        });
    }
    async getAllBanners() {
        const banners = await this.prisma.banner.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return banners.map((banner) => this.mapToResponseDto(banner));
    }
    async getBannerById(id) {
        const banner = await this.prisma.banner.findUnique({
            where: { id },
        });
        if (!banner) {
            throw new common_1.NotFoundException(`Banner with ID ${id} not found`);
        }
        return this.mapToResponseDto(banner);
    }
    async createBanner(dto) {
        this.logger.log(`Creating system banner for ${dto.slotType}/${dto.slotKey}`);
        const metadata = {
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
                vendorId: null,
            },
        });
        const updatedBanner = await this.prisma.banner.update({
            where: { id: banner.id },
            data: {},
        });
        this.logger.log(`Banner created with ID: ${banner.id}`);
        return this.mapToResponseDto(banner);
    }
    async updateBanner(id, dto) {
        await this.getBannerById(id);
        this.logger.log(`Updating banner: ${id}`);
        const updateData = {};
        if (dto.imageUrl)
            updateData.imageUrl = dto.imageUrl;
        if (dto.redirectUrl !== undefined)
            updateData.redirectUrl = dto.redirectUrl;
        if (dto.endDate)
            updateData.endDate = new Date(dto.endDate);
        if (dto.isActive !== undefined)
            updateData.isActive = dto.isActive;
        const banner = await this.prisma.banner.update({
            where: { id },
            data: updateData,
        });
        await this.cache.delPattern('banners:*');
        return this.mapToResponseDto(banner);
    }
    async deleteBanner(id) {
        await this.getBannerById(id);
        this.logger.log(`Deleting banner: ${id}`);
        await this.prisma.banner.delete({
            where: { id },
        });
    }
    async purchaseBannerSlot(vendorId, dto) {
        this.logger.log(`Vendor ${vendorId} purchasing banner slot`);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + dto.durationDays);
        const metadata = {
            slotKey: dto.slotKey,
            slotIndex: dto.slotIndex,
            priority: 50,
            isPaid: true,
            analytics: {
                impressions: 0,
                clicks: 0,
            },
        };
        const banner = await this.prisma.banner.create({
            data: {
                vendorId,
                imageUrl: '',
                redirectUrl: null,
                slotType: dto.slotType,
                startDate,
                endDate,
                isActive: false,
            },
        });
        this.logger.log(`Banner slot purchased with ID: ${banner.id}`);
        return this.mapToResponseDto(banner);
    }
    async uploadBannerCreative(vendorId, dto) {
        const banner = await this.prisma.banner.findUnique({
            where: { id: dto.bannerId },
        });
        if (!banner) {
            throw new common_1.NotFoundException(`Banner with ID ${dto.bannerId} not found`);
        }
        if (banner.vendorId !== vendorId) {
            throw new common_1.BadRequestException('You can only upload creative for your own banners');
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
    async approveBanner(id) {
        const banner = await this.getBannerById(id);
        if (!banner.vendorId) {
            throw new common_1.BadRequestException('This is a system banner, no approval needed');
        }
        this.logger.log(`Approving vendor banner: ${id}`);
        const updatedBanner = await this.prisma.banner.update({
            where: { id },
            data: {
                isActive: true,
            },
        });
        await this.cache.delPattern('banners:*');
        return this.mapToResponseDto(updatedBanner);
    }
    async trackBannerEvent(id, event) {
        this.logger.log(`Tracking ${event} for banner ${id}`);
        const banner = await this.prisma.banner.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!banner) {
            this.logger.warn(`Banner ${id} not found, skipping tracking`);
            return;
        }
        await this.queues.addBannerAnalytics({
            bannerId: id,
            eventType: event,
            timestamp: new Date(),
        });
        this.logger.debug(`${event} queued for banner ${id}`);
    }
    async getBannerAnalytics(id) {
        const banner = await this.getBannerById(id);
        const metadata = this.parseMetadata(banner);
        return {
            bannerId: id,
            slotType: banner.slotType,
            slotKey: metadata.slotKey,
            impressions: metadata.analytics?.impressions || 0,
            clicks: metadata.analytics?.clicks || 0,
            ctr: this.calculateCTR(metadata.analytics?.impressions || 0, metadata.analytics?.clicks || 0),
        };
    }
    async getVendorBanners(vendorId) {
        const banners = await this.prisma.banner.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
        });
        return banners.map((banner) => this.mapToResponseDto(banner));
    }
    calculateCTR(impressions, clicks) {
        if (impressions === 0)
            return 0;
        return (clicks / impressions) * 100;
    }
    parseMetadata(banner) {
        return {
            slotKey: 'CAROUSEL',
            slotIndex: 0,
            priority: banner.vendorId ? 50 : 100,
            isPaid: !!banner.vendorId,
            analytics: {
                impressions: 0,
                clicks: 0,
            },
        };
    }
    mapToResponseDto(banner) {
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
};
exports.BannersService = BannersService;
exports.BannersService = BannersService = BannersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        queues_service_1.QueuesService])
], BannersService);
//# sourceMappingURL=banners.service.js.map