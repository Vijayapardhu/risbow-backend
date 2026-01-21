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
var CouponsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CouponsService = CouponsService_1 = class CouponsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CouponsService_1.name);
    }
    async getAllCoupons() {
        const coupons = await this.prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return coupons.map((coupon) => this.mapToResponseDto(coupon));
    }
    async getActiveCoupons() {
        const now = new Date();
        const coupons = await this.prisma.coupon.findMany({
            where: {
                isActive: true,
                validFrom: { lte: now },
                OR: [
                    { validUntil: null },
                    { validUntil: { gte: now } },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });
        const availableCoupons = coupons.filter((coupon) => {
            if (coupon.usageLimit === null)
                return true;
            return coupon.usedCount < coupon.usageLimit;
        });
        return availableCoupons.map((coupon) => this.mapToResponseDto(coupon));
    }
    async getCouponByCode(code) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { code: code.toUpperCase() },
        });
        if (!coupon) {
            throw new common_1.NotFoundException(`Coupon with code ${code} not found`);
        }
        return this.mapToResponseDto(coupon);
    }
    async validateCoupon(dto) {
        this.logger.log(`Validating coupon: ${dto.code} for cart total: ${dto.cartTotal}`);
        try {
            const coupon = await this.prisma.coupon.findUnique({
                where: { code: dto.code.toUpperCase() },
            });
            if (!coupon) {
                return {
                    isValid: false,
                    message: 'Invalid coupon code',
                };
            }
            if (!coupon.isActive) {
                return {
                    isValid: false,
                    message: 'This coupon is no longer active',
                };
            }
            const now = new Date();
            if (coupon.validFrom && coupon.validFrom > now) {
                return {
                    isValid: false,
                    message: 'This coupon is not yet valid',
                };
            }
            if (coupon.validUntil && coupon.validUntil < now) {
                return {
                    isValid: false,
                    message: 'This coupon has expired',
                };
            }
            if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
                return {
                    isValid: false,
                    message: 'This coupon has reached its usage limit',
                };
            }
            if (coupon.minOrderAmount && dto.cartTotal < coupon.minOrderAmount) {
                return {
                    isValid: false,
                    message: `Minimum order amount of ₹${coupon.minOrderAmount} required`,
                };
            }
            const { discountAmount, finalAmount } = this.calculateDiscount(dto.cartTotal, coupon.discountType, coupon.discountValue, coupon.maxDiscount);
            return {
                isValid: true,
                message: 'Coupon applied successfully',
                discountAmount,
                finalAmount,
                coupon: this.mapToResponseDto(coupon),
            };
        }
        catch (error) {
            this.logger.error(`Error validating coupon: ${error.message}`);
            return {
                isValid: false,
                message: 'Error validating coupon',
            };
        }
    }
    calculateDiscount(cartTotal, discountType, discountValue, maxDiscount) {
        let discountAmount = 0;
        if (discountType === 'PERCENTAGE') {
            discountAmount = Math.floor((cartTotal * discountValue) / 100);
            if (maxDiscount !== null && discountAmount > maxDiscount) {
                discountAmount = maxDiscount;
            }
        }
        else if (discountType === 'FLAT') {
            discountAmount = discountValue;
        }
        if (discountAmount > cartTotal) {
            discountAmount = cartTotal;
        }
        const finalAmount = cartTotal - discountAmount;
        return { discountAmount, finalAmount };
    }
    async incrementUsageCount(couponCode) {
        this.logger.log(`Incrementing usage count for coupon: ${couponCode}`);
        try {
            await this.prisma.coupon.update({
                where: { code: couponCode.toUpperCase() },
                data: {
                    usedCount: { increment: 1 },
                },
            });
            this.logger.log(`Coupon usage count incremented successfully`);
        }
        catch (error) {
            this.logger.error(`Error incrementing coupon usage: ${error.message}`);
        }
    }
    async createCoupon(dto) {
        this.logger.log(`Creating new coupon: ${dto.code}`);
        const existing = await this.prisma.coupon.findUnique({
            where: { code: dto.code.toUpperCase() },
        });
        if (existing) {
            throw new common_1.BadRequestException(`Coupon with code ${dto.code} already exists`);
        }
        const coupon = await this.prisma.coupon.create({
            data: {
                code: dto.code.toUpperCase(),
                description: dto.description,
                discountType: dto.discountType,
                discountValue: dto.discountValue,
                minOrderAmount: dto.minOrderAmount || 0,
                maxDiscount: dto.maxDiscount,
                validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
                validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
                usageLimit: dto.usageLimit,
                isActive: dto.isActive !== undefined ? dto.isActive : true,
            },
        });
        this.logger.log(`Coupon created with ID: ${coupon.id}`);
        return this.mapToResponseDto(coupon);
    }
    async updateCoupon(id, dto) {
        const existing = await this.prisma.coupon.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Coupon with ID ${id} not found`);
        }
        this.logger.log(`Updating coupon: ${id}`);
        const coupon = await this.prisma.coupon.update({
            where: { id },
            data: {
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
                ...(dto.minOrderAmount !== undefined && { minOrderAmount: dto.minOrderAmount }),
                ...(dto.maxDiscount !== undefined && { maxDiscount: dto.maxDiscount }),
                ...(dto.validUntil && { validUntil: new Date(dto.validUntil) }),
                ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
        });
        return this.mapToResponseDto(coupon);
    }
    async deleteCoupon(id) {
        const existing = await this.prisma.coupon.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Coupon with ID ${id} not found`);
        }
        this.logger.log(`Deleting coupon: ${id}`);
        await this.prisma.coupon.delete({
            where: { id },
        });
    }
    mapToResponseDto(coupon) {
        return {
            id: coupon.id,
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minOrderAmount: coupon.minOrderAmount,
            maxDiscount: coupon.maxDiscount,
            validFrom: coupon.validFrom,
            validUntil: coupon.validUntil,
            usageLimit: coupon.usageLimit,
            usedCount: coupon.usedCount,
            isActive: coupon.isActive,
            createdAt: coupon.createdAt,
        };
    }
};
exports.CouponsService = CouponsService;
exports.CouponsService = CouponsService = CouponsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CouponsService);
//# sourceMappingURL=coupons.service.js.map