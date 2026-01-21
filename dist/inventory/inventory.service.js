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
var InventoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../shared/redis.service");
let InventoryService = InventoryService_1 = class InventoryService {
    constructor(prisma, redisService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.logger = new common_1.Logger(InventoryService_1.name);
    }
    getReservationKey(productId, variantId) {
        return `reservation:${productId}:${variantId || 'base'}`;
    }
    async getStock(productId, variationId) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        let stock = product.stock;
        let sku = product.sku;
        let isVariant = false;
        if (variationId) {
            const variants = product.variants || [];
            const variant = variants.find(v => v.id === variationId);
            if (!variant) {
                throw new common_1.NotFoundException('Variation not found');
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
    async reserveStock(productId, quantity, variationId) {
        const status = await this.getStock(productId, variationId);
        if (status.available < quantity) {
            throw new common_1.BadRequestException(`Insufficient stock. Available: ${status.available}, Requested: ${quantity}`);
        }
        const key = this.getReservationKey(productId, variationId);
        const newReserved = await this.redisService.incrBy(key, quantity);
        if (newReserved > status.stock) {
            await this.redisService.decrBy(key, quantity);
            throw new common_1.BadRequestException(`Stock changed during checkout. Please retry.`);
        }
        await this.redisService.expire(key, 900);
        return true;
    }
    async releaseStock(productId, quantity, variationId) {
        const key = this.getReservationKey(productId, variationId);
        const newReserved = await this.redisService.decrBy(key, quantity);
        if (newReserved <= 0) {
            await this.redisService.del(key);
        }
    }
    async deductStock(productId, quantity, variationId) {
        if (variationId) {
            const product = await this.prisma.product.findUnique({ where: { id: productId } });
            if (!product)
                throw new common_1.NotFoundException('Product not found');
            const variants = product.variants || [];
            const variantIndex = variants.findIndex(v => v.id === variationId);
            if (variantIndex === -1)
                throw new common_1.NotFoundException('Variant not found');
            variants[variantIndex].stock -= quantity;
            if (variants[variantIndex].stock < 0)
                throw new common_1.BadRequestException('Stock went negative');
            const newTotalStock = variants.reduce((acc, v) => acc + (v.isActive ? v.stock : 0), 0);
            await this.prisma.product.update({
                where: { id: productId },
                data: {
                    variants: variants,
                    stock: newTotalStock
                }
            });
        }
        else {
            await this.prisma.product.update({
                where: { id: productId },
                data: {
                    stock: { decrement: quantity }
                }
            });
        }
        await this.releaseStock(productId, quantity, variationId);
    }
    async restoreStock(productId, quantity, variationId) {
        if (variationId) {
            const product = await this.prisma.product.findUnique({ where: { id: productId } });
            if (!product)
                return;
            const variants = product.variants || [];
            const variantIndex = variants.findIndex(v => v.id === variationId);
            if (variantIndex === -1)
                return;
            variants[variantIndex].stock += quantity;
            const newTotalStock = variants.reduce((acc, v) => acc + (v.isActive ? v.stock : 0), 0);
            await this.prisma.product.update({
                where: { id: productId },
                data: {
                    variants: variants,
                    stock: newTotalStock
                }
            });
        }
        else {
            await this.prisma.product.update({
                where: { id: productId },
                data: {
                    stock: { increment: quantity }
                }
            });
        }
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = InventoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map