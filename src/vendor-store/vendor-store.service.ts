import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStoreProfileDto, UpdateStoreTimingsDto, UpdatePickupSettingsDto } from './dto/store-settings.dto';
import { CreatePickupPointDto, UpdatePickupPointDto, CreateVendorServiceAreaDto, UpdateVendorServiceAreaDto, CreateVendorDeliveryWindowDto, UpdateVendorDeliveryWindowDto } from './dto/store-settings.dto';

@Injectable()
export class VendorStoreService {
    constructor(private prisma: PrismaService) { }

    private hhmmToMinute(hhmm: string): number {
        const [hh, mm] = hhmm.split(':').map((x) => Number(x));
        return hh * 60 + mm;
    }

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

    async listPickupPoints(vendorId: string) {
        return this.prisma.pickupPoint.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createPickupPoint(vendorId: string, dto: CreatePickupPointDto) {
        return this.prisma.pickupPoint.create({
            data: {
                vendorId,
                name: dto.name,
                addressLine1: dto.addressLine1,
                addressLine2: dto.addressLine2,
                city: dto.city,
                state: dto.state,
                pincode: dto.pincode,
                latitude: dto.latitude,
                longitude: dto.longitude,
                timings: dto.timings as any,
                isActive: dto.isActive ?? true,
            } as any,
        });
    }

    async updatePickupPoint(vendorId: string, pickupPointId: string, dto: UpdatePickupPointDto) {
        const pp = await this.prisma.pickupPoint.findFirst({ where: { id: pickupPointId, vendorId } });
        if (!pp) throw new Error('Pickup point not found');

        return this.prisma.pickupPoint.update({
            where: { id: pickupPointId },
            data: {
                name: dto.name,
                addressLine1: dto.addressLine1,
                addressLine2: dto.addressLine2,
                city: dto.city,
                state: dto.state,
                pincode: dto.pincode,
                latitude: dto.latitude,
                longitude: dto.longitude,
                timings: dto.timings as any,
                isActive: dto.isActive,
            } as any,
        });
    }

    async listServiceAreas(vendorId: string) {
        return this.prisma.vendorServiceArea.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createServiceArea(vendorId: string, dto: CreateVendorServiceAreaDto) {
        return this.prisma.vendorServiceArea.create({
            data: {
                vendorId,
                type: dto.type,
                centerLat: dto.centerLat,
                centerLng: dto.centerLng,
                radiusKm: dto.radiusKm,
                polygon: dto.polygon as any,
                isActive: dto.isActive ?? true,
            } as any,
        });
    }

    async updateServiceArea(vendorId: string, id: string, dto: UpdateVendorServiceAreaDto) {
        const sa = await this.prisma.vendorServiceArea.findFirst({ where: { id, vendorId } });
        if (!sa) throw new Error('Service area not found');

        return this.prisma.vendorServiceArea.update({
            where: { id },
            data: {
                type: dto.type,
                centerLat: dto.centerLat,
                centerLng: dto.centerLng,
                radiusKm: dto.radiusKm,
                polygon: dto.polygon as any,
                isActive: dto.isActive,
            } as any,
        });
    }

    async listDeliveryWindows(vendorId: string) {
        return this.prisma.vendorDeliveryWindow.findMany({
            where: { vendorId },
            orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
        });
    }

    async createDeliveryWindow(vendorId: string, dto: CreateVendorDeliveryWindowDto) {
        const startMinute = this.hhmmToMinute(dto.start);
        const endMinute = this.hhmmToMinute(dto.end);
        if (endMinute <= startMinute) throw new BadRequestException('end must be after start');

        return this.prisma.vendorDeliveryWindow.create({
            data: {
                vendorId,
                weekday: dto.weekday,
                startMinute,
                endMinute,
                isActive: dto.isActive ?? true,
            } as any,
        });
    }

    async updateDeliveryWindow(vendorId: string, id: string, dto: UpdateVendorDeliveryWindowDto) {
        const existing = await this.prisma.vendorDeliveryWindow.findFirst({ where: { id, vendorId } });
        if (!existing) throw new NotFoundException('Delivery window not found');

        const startMinute = this.hhmmToMinute(dto.start);
        const endMinute = this.hhmmToMinute(dto.end);
        if (endMinute <= startMinute) throw new BadRequestException('end must be after start');

        return this.prisma.vendorDeliveryWindow.update({
            where: { id },
            data: {
                weekday: dto.weekday,
                startMinute,
                endMinute,
                isActive: dto.isActive,
            } as any,
        });
    }

    private generateVendorCode(name: string): string {
        // Generate a simple code: NAME-RANDOM
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${cleanName}-${random}`;
    }
}
