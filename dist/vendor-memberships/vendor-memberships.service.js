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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorMembershipsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let VendorMembershipsService = class VendorMembershipsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.TIER_CONFIGS = {
            FREE: {
                tier: 'FREE',
                price: 0,
                skuLimit: 10,
                imageLimit: 3,
                commissionRate: 0.15,
                payoutCycle: 'MONTHLY',
                features: {
                    prioritySupport: false,
                    analytics: false,
                    bulkUpload: false,
                    promotions: false,
                    dedicatedManager: false,
                },
            },
            BASIC: {
                tier: 'BASIC',
                price: 999,
                skuLimit: 100,
                imageLimit: 5,
                commissionRate: 0.12,
                payoutCycle: 'WEEKLY',
                features: {
                    prioritySupport: false,
                    analytics: true,
                    bulkUpload: true,
                    promotions: true,
                    dedicatedManager: false,
                },
            },
            PRO: {
                tier: 'PRO',
                price: 2999,
                skuLimit: 1000,
                imageLimit: 10,
                commissionRate: 0.10,
                payoutCycle: 'WEEKLY',
                features: {
                    prioritySupport: true,
                    analytics: true,
                    bulkUpload: true,
                    promotions: true,
                    dedicatedManager: false,
                },
            },
            PREMIUM: {
                tier: 'PREMIUM',
                price: 4999,
                skuLimit: 999999,
                imageLimit: 15,
                commissionRate: 0.08,
                payoutCycle: 'BIWEEKLY',
                features: {
                    prioritySupport: true,
                    analytics: true,
                    bulkUpload: true,
                    promotions: true,
                    dedicatedManager: false,
                },
            },
            ELITE: {
                tier: 'ELITE',
                price: 9999,
                skuLimit: 999999,
                imageLimit: 20,
                commissionRate: 0.05,
                payoutCycle: 'INSTANT',
                features: {
                    prioritySupport: true,
                    analytics: true,
                    bulkUpload: true,
                    promotions: true,
                    dedicatedManager: true,
                },
            },
        };
    }
    async getAllTiers() {
        return Object.values(this.TIER_CONFIGS);
    }
    async subscribe(vendorId, dto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { VendorMembership: true },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        if (vendor.VendorMembership) {
            throw new common_1.BadRequestException('Vendor already has an active membership. Use upgrade instead.');
        }
        const tierConfig = this.TIER_CONFIGS[dto.tier];
        if (dto.paymentMethod === 'COINS') {
            if (vendor.coinsBalance < tierConfig.price) {
                throw new common_1.BadRequestException('Insufficient coins balance');
            }
            await this.prisma.vendor.update({
                where: { id: vendorId },
                data: { coinsBalance: { decrement: tierConfig.price } },
            });
        }
        else {
        }
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        const membership = await this.prisma.vendorMembership.create({
            data: {
                vendorId,
                tier: dto.tier,
                price: tierConfig.price,
                skuLimit: tierConfig.skuLimit,
                imageLimit: tierConfig.imageLimit,
                commissionRate: tierConfig.commissionRate,
                payoutCycle: tierConfig.payoutCycle,
                features: tierConfig.features,
                endDate,
                autoRenew: dto.autoRenew ?? false,
                isActive: true,
            },
        });
        await this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                tier: dto.tier,
                skuLimit: tierConfig.skuLimit,
                commissionRate: tierConfig.commissionRate,
            },
        });
        return this.getCurrentMembership(vendorId);
    }
    async upgrade(vendorId, dto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { VendorMembership: true, products: true },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        if (!vendor.VendorMembership) {
            throw new common_1.BadRequestException('No active membership found. Please subscribe first.');
        }
        const currentTier = vendor.VendorMembership.tier;
        const newTier = dto.newTier;
        const tierOrder = ['FREE', 'BASIC', 'PRO', 'PREMIUM', 'ELITE'];
        if (tierOrder.indexOf(newTier) <= tierOrder.indexOf(currentTier)) {
            throw new common_1.BadRequestException('Can only upgrade to a higher tier');
        }
        const newTierConfig = this.TIER_CONFIGS[newTier];
        const daysRemaining = Math.ceil((vendor.VendorMembership.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const proratedCost = Math.ceil((newTierConfig.price * daysRemaining) / 30);
        await this.prisma.vendorMembership.update({
            where: { id: vendor.VendorMembership.id },
            data: {
                tier: newTier,
                price: newTierConfig.price,
                skuLimit: newTierConfig.skuLimit,
                imageLimit: newTierConfig.imageLimit,
                commissionRate: newTierConfig.commissionRate,
                payoutCycle: newTierConfig.payoutCycle,
                features: newTierConfig.features,
            },
        });
        await this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                tier: newTier,
                skuLimit: newTierConfig.skuLimit,
                commissionRate: newTierConfig.commissionRate,
            },
        });
        return this.getCurrentMembership(vendorId);
    }
    async getCurrentMembership(vendorId) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: {
                VendorMembership: true,
                products: {
                    where: { isActive: true },
                    select: { id: true },
                },
            },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        if (!vendor.VendorMembership) {
            throw new common_1.NotFoundException('No active membership found');
        }
        const currentSkus = vendor.products.length;
        const remainingSkus = vendor.VendorMembership.skuLimit - currentSkus;
        const usagePercentage = Math.round((currentSkus / vendor.VendorMembership.skuLimit) * 100);
        return {
            id: vendor.VendorMembership.id,
            tier: vendor.VendorMembership.tier,
            price: vendor.VendorMembership.price,
            skuLimit: vendor.VendorMembership.skuLimit,
            imageLimit: vendor.VendorMembership.imageLimit,
            commissionRate: vendor.VendorMembership.commissionRate,
            payoutCycle: vendor.VendorMembership.payoutCycle,
            isActive: vendor.VendorMembership.isActive,
            autoRenew: vendor.VendorMembership.autoRenew,
            startDate: vendor.VendorMembership.startDate,
            endDate: vendor.VendorMembership.endDate,
            usage: {
                currentSkus,
                remainingSkus,
                usagePercentage,
            },
        };
    }
    async cancelAutoRenewal(vendorId) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { VendorMembership: true },
        });
        if (!vendor || !vendor.VendorMembership) {
            throw new common_1.NotFoundException('No active membership found');
        }
        await this.prisma.vendorMembership.update({
            where: { id: vendor.VendorMembership.id },
            data: { autoRenew: false },
        });
        return {
            message: 'Auto-renewal cancelled successfully',
            endDate: vendor.VendorMembership.endDate,
        };
    }
};
exports.VendorMembershipsService = VendorMembershipsService;
exports.VendorMembershipsService = VendorMembershipsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VendorMembershipsService);
//# sourceMappingURL=vendor-memberships.service.js.map