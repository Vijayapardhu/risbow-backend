import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsEnum, IsBoolean, IsDateString, Min } from 'class-validator';

export class CreateCouponDto {
    @ApiProperty({ example: 'NEWUSER50', description: 'Unique coupon code' })
    @IsString()
    code: string;

    @ApiPropertyOptional({ example: '50% off for new users', description: 'Coupon description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'PERCENTAGE', enum: ['PERCENTAGE', 'FLAT'], description: 'Discount type' })
    @IsEnum(['PERCENTAGE', 'FLAT'])
    discountType: string;

    @ApiProperty({ example: 50, description: 'Discount value (percentage or flat amount)' })
    @IsInt()
    @Min(0)
    discountValue: number;

    @ApiPropertyOptional({ example: 500, description: 'Minimum order amount required' })
    @IsOptional()
    @IsInt()
    @Min(0)
    minOrderAmount?: number;

    @ApiPropertyOptional({ example: 200, description: 'Maximum discount cap (for percentage)' })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxDiscount?: number;

    @ApiPropertyOptional({ example: '2026-01-21T00:00:00Z', description: 'Valid from date' })
    @IsOptional()
    @IsDateString()
    validFrom?: string;

    @ApiPropertyOptional({ example: '2026-02-21T23:59:59Z', description: 'Valid until date' })
    @IsOptional()
    @IsDateString()
    validUntil?: string;

    @ApiPropertyOptional({ example: 100, description: 'Maximum usage limit globally' })
    @IsOptional()
    @IsInt()
    @Min(0)
    usageLimit?: number;

    @ApiPropertyOptional({ example: true, description: 'Is coupon active' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: 'vendor_123', description: 'Vendor ID (for admin use)' })
    @IsOptional()
    @IsString()
    vendorId?: string;

    @ApiPropertyOptional({ example: ['prod_1', 'prod_2'], description: 'Restricted product IDs' })
    @IsOptional()
    @IsString({ each: true })
    productIds?: string[];

    @ApiPropertyOptional({ example: ['cat_1'], description: 'Restricted category IDs' })
    @IsOptional()
    @IsString({ each: true })
    categoryIds?: string[];

    @ApiPropertyOptional({ example: 1, description: 'Minimum quantity required' })
    @IsOptional()
    @IsInt()
    @Min(1)
    minQuantity?: number;
}

export class UpdateCouponDto {
    @ApiPropertyOptional({ example: 'Updated description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 60 })
    @IsOptional()
    @IsInt()
    @Min(0)
    discountValue?: number;

    @ApiPropertyOptional({ example: 600 })
    @IsOptional()
    @IsInt()
    @Min(0)
    minOrderAmount?: number;

    @ApiPropertyOptional({ example: 250 })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxDiscount?: number;

    @ApiPropertyOptional({ example: '2026-03-21T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    validUntil?: string;

    @ApiPropertyOptional({ example: 200 })
    @IsOptional()
    @IsInt()
    @Min(0)
    usageLimit?: number;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: ['prod_1'], description: 'Restricted product IDs' })
    @IsOptional()
    @IsString({ each: true })
    productIds?: string[];

    @ApiPropertyOptional({ example: ['cat_1'], description: 'Restricted category IDs' })
    @IsOptional()
    @IsString({ each: true })
    categoryIds?: string[];

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    minQuantity?: number;
}

export class ValidateCouponDto {
    @ApiProperty({ example: 'NEWUSER50', description: 'Coupon code to validate' })
    @IsString()
    code: string;

    @ApiProperty({ example: 1200, description: 'Cart total amount' })
    @IsInt()
    @Min(0)
    cartTotal: number;

    @ApiPropertyOptional({ example: 'user_123', description: 'User ID for per-user limits' })
    @IsOptional()
    @IsString()
    userId?: string;
}

export class ApplyCouponDto {
    @ApiProperty({ example: 'NEWUSER50', description: 'Coupon code to apply' })
    @IsString()
    code: string;
}

export class CouponResponseDto {
    @ApiProperty({ example: 'coupon_123' })
    id: string;

    @ApiProperty({ example: 'NEWUSER50' })
    code: string;

    @ApiProperty({ example: '50% off for new users' })
    description?: string;

    @ApiProperty({ example: 'PERCENTAGE' })
    discountType: string;

    @ApiProperty({ example: 50 })
    discountValue: number;

    @ApiProperty({ example: 500 })
    minOrderAmount?: number;

    @ApiProperty({ example: 200 })
    maxDiscount?: number;

    @ApiProperty()
    validFrom: Date;

    @ApiProperty()
    validUntil?: Date;

    @ApiProperty({ example: 100 })
    usageLimit?: number;

    @ApiProperty({ example: 25 })
    usedCount: number;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty()
    createdAt: Date;
}

export class CouponValidationResponseDto {
    @ApiProperty({ example: true, description: 'Is coupon valid' })
    isValid: boolean;

    @ApiProperty({ example: 'Coupon applied successfully', description: 'Validation message' })
    message: string;

    @ApiPropertyOptional({ example: 100, description: 'Discount amount in INR' })
    discountAmount?: number;

    @ApiPropertyOptional({ example: 1100, description: 'Final amount after discount' })
    finalAmount?: number;

    @ApiPropertyOptional({ type: CouponResponseDto, description: 'Coupon details if valid' })
    coupon?: CouponResponseDto;
}
