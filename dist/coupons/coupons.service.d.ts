import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto, CouponResponseDto, CouponValidationResponseDto } from './dto/coupon.dto';
import { CacheService } from '../shared/cache.service';
export declare class CouponsService {
    private prisma;
    private cache;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService);
    getAllCoupons(): Promise<CouponResponseDto[]>;
    getActiveCoupons(): Promise<CouponResponseDto[]>;
    getCouponByCode(code: string): Promise<CouponResponseDto>;
    validateCoupon(dto: ValidateCouponDto): Promise<CouponValidationResponseDto>;
    calculateDiscount(cartTotal: number, discountType: string, discountValue: number, maxDiscount: number | null): {
        discountAmount: number;
        finalAmount: number;
    };
    incrementUsageCount(couponCode: string): Promise<void>;
    createCoupon(dto: CreateCouponDto): Promise<CouponResponseDto>;
    updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponResponseDto>;
    deleteCoupon(id: string): Promise<void>;
    private mapToResponseDto;
}
