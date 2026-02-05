import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    UpdateVendorProfileDto,
    UpdateVendorLogoDto,
    UpdateVendorBannerDto,
    UpdateVendorHoursDto,
    UpdateVendorPickupDto,
    UpdateVendorStatusDto,
} from './dto/vendor-profile.dto';

@Injectable()
export class VendorProfileService {
    constructor(private readonly prisma: PrismaService) {}

    async getProfile(vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                id: true,
                name: true,
                storeName: true,
                email: true,
                mobile: true,
                vendorCode: true,
                storeLogo: true,
                storeBanner: true,
                storeTimings: true,
                storeStatus: true,
                storeClosedUntil: true,
                latitude: true,
                longitude: true,
                pincode: true,
                pickupEnabled: true,
                pickupTimings: true,
                performanceScore: true,
                followCount: true,
                tier: true,
                kycStatus: true,
                gstNumber: true,
                isGstVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        return vendor;
    }

    async updateProfile(vendorId: string, dto: UpdateVendorProfileDto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                storeName: dto.storeName,
                email: dto.email,
                latitude: dto.latitude,
                longitude: dto.longitude,
                pincode: dto.pincode,
            },
            select: {
                id: true,
                storeName: true,
                email: true,
                latitude: true,
                longitude: true,
                pincode: true,
                updatedAt: true,
            },
        });
    }

    async updateLogo(vendorId: string, dto: UpdateVendorLogoDto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                storeLogo: dto.logoUrl,
            },
            select: {
                id: true,
                storeLogo: true,
                updatedAt: true,
            },
        });
    }

    async updateBanner(vendorId: string, dto: UpdateVendorBannerDto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                storeBanner: dto.bannerUrl,
            },
            select: {
                id: true,
                storeBanner: true,
                updatedAt: true,
            },
        });
    }

    async updateHours(vendorId: string, dto: UpdateVendorHoursDto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Build store timings from DTO
        let storeTimings: any = dto.storeTimings || {};

        // If simple open/close times provided, apply to all days
        if (dto.openTime && dto.closeTime) {
            const dailyTiming = { open: dto.openTime, close: dto.closeTime, isOpen: true };
            storeTimings = {
                monday: dailyTiming,
                tuesday: dailyTiming,
                wednesday: dailyTiming,
                thursday: dailyTiming,
                friday: dailyTiming,
                saturday: dailyTiming,
                sunday: dailyTiming,
            };
        }

        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                storeTimings,
            },
            select: {
                id: true,
                storeTimings: true,
                updatedAt: true,
            },
        });
    }

    async updatePickup(vendorId: string, dto: UpdateVendorPickupDto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                pickupEnabled: dto.pickupEnabled,
                pickupTimings: dto.pickupTimings as any || null,
            },
            select: {
                id: true,
                pickupEnabled: true,
                pickupTimings: true,
                updatedAt: true,
            },
        });
    }

    async updateStatus(vendorId: string, dto: UpdateVendorStatusDto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        return this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                storeStatus: dto.storeStatus,
                storeClosedUntil: dto.storeClosedUntil ? new Date(dto.storeClosedUntil) : null,
            },
            select: {
                id: true,
                storeStatus: true,
                storeClosedUntil: true,
                updatedAt: true,
            },
        });
    }

    async getPublicProfile(vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                id: true,
                storeName: true,
                storeLogo: true,
                storeBanner: true,
                vendorCode: true,
                storeTimings: true,
                storeStatus: true,
                pickupEnabled: true,
                performanceScore: true,
                followCount: true,
                tier: true,
                latitude: true,
                longitude: true,
                pincode: true,
                createdAt: true,
                _count: {
                    select: {
                        Product: true,
                        Review: true,
                    },
                },
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        return {
            ...vendor,
            productCount: vendor._count.Product,
            reviewCount: vendor._count.Review,
            _count: undefined,
        };
    }
}

