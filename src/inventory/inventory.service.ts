import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from '../shared/redis.service';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        private prisma: PrismaService,
        private redisService: RedisService
    ) { }

    private getReservationKey(productId: string, variantId?: string) {
        return `reservation:${productId}:${variantId || 'base'}`;
    }

    async getStock(productId: string, variationId?: string) {
        if (variationId) {
            const variant = await (this.prisma as any).productVariant.findUnique({
                where: { id: variationId },
                include: { Product: true }
            });

            if (!variant || variant.productId !== productId) {
                throw new NotFoundException('Variation not found');
            }

            const key = this.getReservationKey(productId, variationId);
            const reserved = parseInt(await this.redisService.get(key) || '0', 10);
            const available = Math.max(0, variant.stock - reserved);

            return {
                productId: variant.productId,
                variationId: variant.id,
                sku: variant.sku || variant.product.sku,
                stock: variant.stock,
                reserved,
                available,
                status: available > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
                isLowStock: available < 5 && available > 0
            };
        }

        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const key = this.getReservationKey(productId);
        const reserved = parseInt(await this.redisService.get(key) || '0', 10);
        const available = Math.max(0, product.stock - reserved);

        return {
            productId: product.id,
            variationId: null,
            sku: product.sku,
            stock: product.stock,
            reserved,
            available,
            status: available > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
            isLowStock: available < 5 && available > 0
        };
    }

    async reserveStock(productId: string, quantity: number, variationId?: string) {
        // 1. Check metadata (optimistic check)
        const status = await this.getStock(productId, variationId);
        if (status.available < quantity) {
            throw new BadRequestException(`Insufficient stock. Available: ${status.available}, Requested: ${quantity}`);
        }

        const key = this.getReservationKey(productId, variationId);

        // 2. Atomic Increment
        const newReserved = await this.redisService.incrBy(key, quantity);

        // 3. Post-Increment Validation
        if (newReserved > status.stock) {
            // Over-reserved! Rollback.
            await this.redisService.decrBy(key, quantity);
            throw new BadRequestException(`Stock changed during checkout. Please retry.`);
        }

        // Refresh TTL
        await this.redisService.expire(key, 900); // 15 mins

        return true;
    }

    async releaseStock(productId: string, quantity: number, variationId?: string) {
        const key = this.getReservationKey(productId, variationId);
        const newReserved = await this.redisService.decrBy(key, quantity);
        if (newReserved <= 0) {
            await this.redisService.del(key);
        }
    }

    // Phase 4.1: Final Deduction
    async deductStock(productId: string, quantity: number, variationId?: string, tx?: Prisma.TransactionClient) {
        const db = tx || this.prisma;

        if (variationId) {
            // Atomic decrement on variant
            const result = await (db as any).productVariant.updateMany({
                where: {
                    id: variationId,
                    productId,
                    stock: { gte: quantity }
                },
                data: {
                    stock: { decrement: quantity }
                }
            });

            if (result.count === 0) {
                throw new BadRequestException(`Insufficient stock for variant ${variationId}`);
            }

            // 🔐 Money/Inventory safety:
            // Keep Product.stock consistent with variants WITHOUT risking negative stock due to drift.
            // Recompute from variants after the atomic variant decrement.
            const agg = await (db as any).productVariant.aggregate({
                where: { productId },
                _sum: { stock: true },
            });
            const totalVariantStock = Math.max(0, Number(agg?._sum?.stock || 0));
            await db.product.update({
                where: { id: productId },
                data: { stock: totalVariantStock },
            });
        } else {
            const result = await db.product.updateMany({
                where: {
                    id: productId,
                    stock: { gte: quantity }
                },
                data: {
                    stock: { decrement: quantity }
                }
            });

            if (result.count === 0) {
                throw new BadRequestException('Insufficient stock or product not found');
            }
        }

        // Also release reservation
        await this.releaseStock(productId, quantity, variationId);
    }

    async restoreStock(productId: string, quantity: number, variationId?: string, tx?: Prisma.TransactionClient) {
        const db = tx || this.prisma;

        if (variationId) {
            await (db as any).productVariant.update({
                where: { id: variationId },
                data: { stock: { increment: quantity } }
            });
            await db.product.update({
                where: { id: productId },
                data: { stock: { increment: quantity } }
            });
        } else {
            await db.product.update({
                where: { id: productId },
                data: { stock: { increment: quantity } }
            });
        }
    }

    /**
     * 📍 Phase 6.3: Hyper-local Proximity Sourcing
     * Finds the closest vendor warehouse to the destination coordinates.
     */
    async sourceOptimalInventory(productId: string, destination: { lat: number; lng: number } | string, variationId?: string) {
        // 1. Get all vendors with stock
        const vendorsWithStock = await this.prisma.vendor.findMany({
            where: {
                products: { some: { id: productId, stock: { gt: 0 } } },
                latitude: { not: null },
                longitude: { not: null }
            } as any,
            select: { id: true, latitude: true, longitude: true, pincode: true } as any
        });

        if (vendorsWithStock.length === 0) return null;

        // 2. Determine target coordinates
        let targetLat: number, targetLng: number;
        if (typeof destination === 'string') {
            // Simple Pincode Lookup (Stubbed logic: in production, use a Geo-DB or Google Maps API)
            // For now, we'll try to find any vendor in that pincode first.
            const localVendor = (vendorsWithStock as any[]).find(v => v.pincode === destination);
            if (localVendor) return localVendor.id;

            // Fallback: If not in same pincode, we'd ideally convert pincode to lat/lng.
            // Using a mock "Mid-City" coordinate for demo/MVP.
            targetLat = 12.9716; targetLng = 77.5946;
        } else {
            targetLat = destination.lat;
            targetLng = destination.lng;
        }

        // 3. Haversine Distance Calculation
        const scoredVendors = (vendorsWithStock as any[]).map(v => {
            const distance = this.calculateDistance(targetLat, targetLng, Number(v.latitude), Number(v.longitude));
            return { id: v.id, distance };
        });

        scoredVendors.sort((a, b) => a.distance - b.distance);

        this.logger.debug(`Optimized sourcing for ${productId}: Closest is ${scoredVendors[0].id} (${scoredVendors[0].distance.toFixed(2)}km)`);
        return scoredVendors[0].id;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
