import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateCouponDto,
    UpdateCouponDto,
    ValidateCouponDto,
    CouponResponseDto,
    CouponValidationResponseDto,
} from './dto/coupon.dto';
import { CacheService } from '../shared/cache.service';

@Injectable()
export class CouponsService {
    private readonly logger = new Logger(CouponsService.name);

    constructor(
        private prisma: PrismaService,
        private cache: CacheService
    ) { }

    /**
     * Get all coupons (admin)
     */
    async getAllCoupons(): Promise<CouponResponseDto[]> {
        const coupons = await this.prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return coupons.map((coupon) => this.mapToResponseDto(coupon));
    }

    /**
     * Get active coupons for user
     */
    async getActiveCoupons(): Promise<CouponResponseDto[]> {
        const cacheKey = 'coupons:active';

        return await this.cache.getOrSet(
            cacheKey,
            300, // 5 mins
            async () => {
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

                // Filter out coupons that have reached usage limit
                // Note: Usage limit filtering is dynamic (transactional), but for listing we cache it.
                // Strict correctness would require not caching this or invalidating heavily.
                // For performance, we cache this list, but validateCoupon checks DB.
                const availableCoupons = coupons.filter((coupon) => {
                    if (coupon.usageLimit === null) return true;
                    return coupon.usedCount < coupon.usageLimit;
                });

                return availableCoupons.map((coupon) => this.mapToResponseDto(coupon));
            }
        );
    }

    /**
     * Get coupon by code
     */
    async getCouponByCode(code: string): Promise<CouponResponseDto> {
        const normalizedCode = code.toUpperCase();
        const cacheKey = `coupon:${normalizedCode}`;

        return await this.cache.getOrSet(
            cacheKey,
            600, // 10 mins
            async () => {
                const coupon = await this.prisma.coupon.findUnique({
                    where: { code: normalizedCode },
                });

                if (!coupon) {
                    throw new NotFoundException(`Coupon with code ${code} not found`);
                }

                return this.mapToResponseDto(coupon);
            }
        );
    }

    /**
     * Validate coupon without applying
     */
    async validateCoupon(dto: ValidateCouponDto): Promise<CouponValidationResponseDto> {
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

            // Check if coupon is active
            if (!coupon.isActive) {
                return {
                    isValid: false,
                    message: 'This coupon is no longer active',
                };
            }

            // Check validity dates
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

            // Check usage limit
            if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
                return {
                    isValid: false,
                    message: 'This coupon has reached its usage limit',
                };
            }

            // Check minimum order amount
            if (coupon.minOrderAmount && dto.cartTotal < coupon.minOrderAmount) {
                return {
                    isValid: false,
                    message: `Minimum order amount of ₹${coupon.minOrderAmount} required`,
                };
            }

            // Calculate discount
            const { discountAmount, finalAmount } = this.calculateDiscount(
                dto.cartTotal,
                coupon.discountType,
                coupon.discountValue,
                coupon.maxDiscount,
            );

            return {
                isValid: true,
                message: 'Coupon applied successfully',
                discountAmount,
                finalAmount,
                coupon: this.mapToResponseDto(coupon),
            };
        } catch (error) {
            this.logger.error(`Error validating coupon: ${error.message}`);
            return {
                isValid: false,
                message: 'Error validating coupon',
            };
        }
    }

    /**
     * Calculate discount amount
     */
    calculateDiscount(
        cartTotal: number,
        discountType: string,
        discountValue: number,
        maxDiscount: number | null,
    ): { discountAmount: number; finalAmount: number } {
        let discountAmount = 0;

        if (discountType === 'PERCENTAGE') {
            discountAmount = Math.floor((cartTotal * discountValue) / 100);

            // Apply max discount cap
            if (maxDiscount !== null && discountAmount > maxDiscount) {
                discountAmount = maxDiscount;
            }
        } else if (discountType === 'FLAT') {
            discountAmount = discountValue;
        }

        // Ensure discount doesn't exceed cart total
        if (discountAmount > cartTotal) {
            discountAmount = cartTotal;
        }

        const finalAmount = cartTotal - discountAmount;

        return { discountAmount, finalAmount };
    }

    /**
     * Increment coupon usage count (called after order success)
     */
    async incrementUsageCount(couponCode: string): Promise<void> {
        this.logger.log(`Incrementing usage count for coupon: ${couponCode}`);

        try {
            await this.prisma.coupon.update({
                where: { code: couponCode.toUpperCase() },
                data: {
                    usedCount: { increment: 1 },
                },
            });

            this.logger.log(`Coupon usage count incremented successfully`);
        } catch (error) {
            this.logger.error(`Error incrementing coupon usage: ${error.message}`);
            // Don't throw error as order is already created
        }
    }

    /**
     * Create new coupon (admin)
     */
    async createCoupon(dto: CreateCouponDto): Promise<CouponResponseDto> {
        this.logger.log(`Creating new coupon: ${dto.code}`);

        // Check if coupon code already exists
        const existing = await this.prisma.coupon.findUnique({
            where: { code: dto.code.toUpperCase() },
        });

        if (existing) {
            throw new BadRequestException(`Coupon with code ${dto.code} already exists`);
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

        // Invalidate active coupons list
        await this.cache.del('coupons:active');

        return this.mapToResponseDto(coupon);
    }

    /**
     * Update coupon (admin)
     */
    async updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponResponseDto> {
        // Check if coupon exists
        const existing = await this.prisma.coupon.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Coupon with ID ${id} not found`);
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

        // Invalidate specific coupon and active list
        await this.cache.del(`coupon:${existing.code}`);
        await this.cache.del('coupons:active');

        return this.mapToResponseDto(coupon);
    }

    /**
     * Delete coupon (admin)
     */
    async deleteCoupon(id: string): Promise<void> {
        // Check if coupon exists
        const existing = await this.prisma.coupon.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Coupon with ID ${id} not found`);
        }

        this.logger.log(`Deleting coupon: ${id}`);

        await this.prisma.coupon.delete({
            where: { id },
        });

        // Invalidate specific coupon and active list
        await this.cache.del(`coupon:${existing.code}`);
        await this.cache.del('coupons:active');
    }

    /**
     * Map database model to response DTO
     */
    private mapToResponseDto(coupon: any): CouponResponseDto {
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
}
