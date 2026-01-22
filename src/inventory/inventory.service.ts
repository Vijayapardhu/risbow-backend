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
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        let stock = product.stock;
        let sku = product.sku;
        let isVariant = false;

        if (variationId) {
            const variants = (product.variants as any[]) || [];
            const variant = variants.find(v => v.id === variationId);

            if (!variant) {
                throw new NotFoundException('Variation not found');
            }

            stock = variant.stock;
            sku = variant.sku || sku;
            isVariant = true;
        }

        const key = this.getReservationKey(productId, variationId);
        const reservedStr = await this.redisService.get(key);
        const reserved = parseInt(reservedStr || '0', 10);
        const available = Math.max(0, stock - reserved);

        return {
            productId: product.id,
            variationId: isVariant ? variationId : null,
            sku,
            stock: stock,
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
            // 1. Fetch Product to get current variants
            const product = await db.product.findUnique({ where: { id: productId } });
            if (!product) throw new NotFoundException('Product not found');

            const variants = (product.variants as any[]) || [];
            const variantIndex = variants.findIndex(v => v.id === variationId);

            if (variantIndex === -1) throw new NotFoundException('Variant not found');

            // 2. Validate Stock
            if (variants[variantIndex].stock < quantity) {
                throw new BadRequestException(`Insufficient stock for variant. Available: ${variants[variantIndex].stock}`);
            }

            // 3. Update memory array 
            variants[variantIndex].stock -= quantity;

            // Update Product + Variants
            const newTotalStock = variants.reduce((acc, v) => acc + (v.isActive ? v.stock : 0), 0);

            await db.product.update({
                where: { id: productId },
                data: {
                    variants: variants as any,
                    stock: newTotalStock
                }
            });
        } else {
            // Simple Product Stock - Atomic decrement handles race conditions better here
            // We check for negative after update or rely on check constraint (if exists)
            // But Prisma/Postgres won't throw on negative int unless constraint exists.
            // So we should verify. 
            // For high concurrency, 'decrement' is safe but we need to ensure it didn't go below 0.

            // Using updateMany to allow 'where' clause checking stock >= quantity could be safer but 'id' is unique.
            // Alternative: update where stock >= quantity.
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

        // Also release reservation as we have consumed it physically
        await this.releaseStock(productId, quantity, variationId);
    }

    // Phase 5.1: Stock Rollback
    async restoreStock(productId: string, quantity: number, variationId?: string, tx?: Prisma.TransactionClient) {
        const db = tx || this.prisma;

        if (variationId) {
            const product = await db.product.findUnique({ where: { id: productId } });
            if (!product) return;

            const variants = (product.variants as any[]) || [];
            const variantIndex = variants.findIndex(v => v.id === variationId);

            if (variantIndex === -1) return;

            variants[variantIndex].stock += quantity;

            const newTotalStock = variants.reduce((acc, v) => acc + (v.isActive ? v.stock : 0), 0);

            await db.product.update({
                where: { id: productId },
                data: {
                    variants: variants as any,
                    stock: newTotalStock
                }
            });
        } else {
            await db.product.update({
                where: { id: productId },
                data: {
                    stock: { increment: quantity }
                }
            });
        }
    }
}
