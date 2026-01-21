export declare class CreateCouponDto {
    code: string;
    description?: string;
    discountType: string;
    discountValue: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    validFrom?: string;
    validUntil?: string;
    usageLimit?: number;
    isActive?: boolean;
}
export declare class UpdateCouponDto {
    description?: string;
    discountValue?: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    validUntil?: string;
    usageLimit?: number;
    isActive?: boolean;
}
export declare class ValidateCouponDto {
    code: string;
    cartTotal: number;
}
export declare class ApplyCouponDto {
    code: string;
}
export declare class CouponResponseDto {
    id: string;
    code: string;
    description?: string;
    discountType: string;
    discountValue: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    validFrom: Date;
    validUntil?: Date;
    usageLimit?: number;
    usedCount: number;
    isActive: boolean;
    createdAt: Date;
}
export declare class CouponValidationResponseDto {
    isValid: boolean;
    message: string;
    discountAmount?: number;
    finalAmount?: number;
    coupon?: CouponResponseDto;
}
