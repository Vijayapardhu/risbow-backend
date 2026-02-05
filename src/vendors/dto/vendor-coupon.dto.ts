import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export enum CouponDiscountType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
}

export class CreateVendorCouponDto {
  @ApiProperty({ description: 'Unique coupon code', example: 'SUMMER20' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Coupon code must contain only alphanumeric characters, hyphens, and underscores',
  })
  code: string;

  @ApiPropertyOptional({ description: 'Coupon description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Discount type',
    enum: CouponDiscountType,
    example: CouponDiscountType.PERCENTAGE,
  })
  @IsEnum(CouponDiscountType)
  type: CouponDiscountType;

  @ApiProperty({ description: 'Discount value (paise for FLAT, percentage for PERCENTAGE)', example: 20 })
  @IsInt()
  @Min(1)
  value: number;

  @ApiPropertyOptional({ description: 'Minimum order amount in paise', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrder?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount in paise (for PERCENTAGE type)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Coupon expiration date (ISO 8601)', example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Maximum number of times this coupon can be used' })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Minimum quantity of items required' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @ApiPropertyOptional({ description: 'Restrict to specific product IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Restrict to specific category IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}

export class UpdateVendorCouponDto extends PartialType(CreateVendorCouponDto) {
  @ApiPropertyOptional({ description: 'Activate or deactivate the coupon' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class VendorCouponQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search by coupon code' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CouponResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() discountType: string;
  @ApiProperty() discountValue: number;
  @ApiPropertyOptional() minOrderAmount?: number;
  @ApiPropertyOptional() maxDiscount?: number;
  @ApiProperty() validFrom: Date;
  @ApiPropertyOptional() validUntil?: Date;
  @ApiPropertyOptional() usageLimit?: number;
  @ApiProperty() usedCount: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class CouponUsageStatsDto {
  @ApiProperty() couponId: string;
  @ApiProperty() code: string;
  @ApiProperty() totalUses: number;
  @ApiProperty() usageLimit: number | null;
  @ApiProperty() remainingUses: number | null;
  @ApiProperty() totalDiscountGiven: number;
  @ApiProperty() uniqueCustomers: number;
  @ApiProperty() recentOrders: {
    orderId: string;
    userId: string;
    discountAmount: number;
    orderTotal: number;
    createdAt: Date;
  }[];
}
