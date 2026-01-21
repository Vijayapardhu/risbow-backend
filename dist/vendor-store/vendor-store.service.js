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
exports.VendorStoreService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let VendorStoreService = class VendorStoreService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(vendorId) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: {
                VendorMembership: true,
                _count: {
                    select: { products: true, reviews: true, VendorFollower: true }
                }
            }
        });
        if (!vendor)
            throw new common_1.NotFoundException('Vendor profile not found');
        return {
            ...vendor,
            stats: {
                productsRaw: vendor._count.products,
                followers: vendor._count.VendorFollower,
                reviews: vendor._count.reviews
            }
        };
    }
    async getPublicProfile(vendorCode) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { vendorCode },
            include: {
                _count: {
                    select: { products: true, reviews: true, VendorFollower: true }
                }
            }
        });
        if (!vendor)
            throw new common_1.NotFoundException('Store not found');
        return {
            id: vendor.id,
            storeName: vendor.storeName || vendor.name,
            storeLogo: vendor.storeLogo,
            storeBanner: vendor.storeBanner,
            vendorCode: vendor.vendorCode,
            timings: vendor.storeTimings,
            pickupEnabled: vendor.pickupEnabled,
            rating: vendor.performanceScore,
            joinedAt: vendor.createdAt,
            stats: {
                products: vendor._count.products,
                reviews: vendor._count.reviews,
                followers: vendor._count.VendorFollower
            }
        };
    }
    async updateProfile(vendorId, dto) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        let vendorCodeUpdate = {};
        if (!vendor.vendorCode && dto.storeName) {
            let code = '';
            let isUnique = false;
            let attempts = 0;
            while (!isUnique && attempts < 3) {
                code = this.generateVendorCode(dto.storeName);
                const existing = await this.prisma.vendor.findUnique({ where: { vendorCode: code } });
                if (!existing) {
                    isUnique = true;
                }
                attempts++;
            }
            if (!isUnique) {
                code = `${this.generateVendorCode(dto.storeName)}-${Date.now().toString().slice(-4)}`;
            }
            vendorCodeUpdate = { vendorCode: code };
        }
        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                ...dto,
                ...vendorCodeUpdate
            }
        });
    }
    async updateTimings(vendorId, dto) {
        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                storeTimings: dto.timings
            }
        });
    }
    async updatePickupSettings(vendorId, dto) {
        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                pickupEnabled: dto.pickupEnabled,
                pickupTimings: dto.pickupTimings
            }
        });
    }
    generateVendorCode(name) {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${cleanName}-${random}`;
    }
};
exports.VendorStoreService = VendorStoreService;
exports.VendorStoreService = VendorStoreService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VendorStoreService);
//# sourceMappingURL=vendor-store.service.js.map