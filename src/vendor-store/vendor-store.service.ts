import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStoreProfileDto, UpdateStoreTimingsDto, UpdatePickupSettingsDto } from './dto/store-settings.dto';

@Injectable()
export class VendorStoreService {
    constructor(private prisma: PrismaService) { }

    async getProfile(vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: {
                VendorMembership: true,
                _count: {
                    select: { products: true, reviews: true, VendorFollower: true }
                }
            }
        });

        if (!vendor) throw new NotFoundException('Vendor profile not found');

        return {
            ...vendor,
            stats: {
                productsRaw: vendor._count.products,
                followers: vendor._count.VendorFollower,
                reviews: vendor._count.reviews
            }
        };
    }

    async getPublicProfile(vendorCode: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { vendorCode },
            include: {
                _count: {
                    select: { products: true, reviews: true, VendorFollower: true }
                }
            }
        });

        if (!vendor) throw new NotFoundException('Store not found');

        // Filter public fields only
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

    async updateProfile(vendorId: string, dto: UpdateStoreProfileDto) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });

        let vendorCodeUpdate = {};
        if (!vendor.vendorCode && dto.storeName) {
            // Try to generate unique code up to 3 times
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
                // Fallback to timestamp if random failed collision check
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

    async updateTimings(vendorId: string, dto: UpdateStoreTimingsDto) {
        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                storeTimings: dto.timings as any
            }
        });
    }

    async updatePickupSettings(vendorId: string, dto: UpdatePickupSettingsDto) {
        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                pickupEnabled: dto.pickupEnabled,
                pickupTimings: dto.pickupTimings as any
            }
        });
    }

    private generateVendorCode(name: string): string {
        // Generate a simple code: NAME-RANDOM
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${cleanName}-${random}`;
    }
}
