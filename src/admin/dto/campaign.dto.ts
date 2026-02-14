import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsInt, IsBoolean, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CampaignOfferType {
  FLASH_SALE = 'FLASH_SALE',
  FESTIVAL_OFFER = 'FESTIVAL_OFFER',
  CLEARANCE = 'CLEARANCE',
  NEW_ARRIVAL = 'NEW_ARRIVAL',
  MEMBER_EXCLUSIVE = 'MEMBER_EXCLUSIVE',
  SEASONAL = 'SEASONAL',
}

export enum MarketingCampaignStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum CampaignDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export class CampaignProductDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Custom discount for this product (overrides campaign discount)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  customDiscount?: number;

  @ApiPropertyOptional({ description: 'Stock allocated for this product in campaign' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockAllocated?: number;
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CampaignOfferType, description: 'Campaign type' })
  @IsEnum(CampaignOfferType)
  type: CampaignOfferType;

  @ApiProperty({ description: 'Campaign start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Campaign end date (ISO 8601)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: CampaignDiscountType, description: 'Discount type' })
  @IsEnum(CampaignDiscountType)
  discountType: CampaignDiscountType;

  @ApiProperty({ description: 'Discount value (percentage 0-100 or fixed amount in paise)' })
  @IsInt()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ description: 'Maximum discount in paise (for PERCENTAGE type)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Minimum order value in paise to qualify' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({ description: 'Enable limited stock for campaign', default: false })
  @IsOptional()
  @IsBoolean()
  limitedStock?: boolean;

  @ApiPropertyOptional({ description: 'Total stock allocated for campaign' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalStock?: number;

  @ApiPropertyOptional({ description: 'Campaign priority (higher = applied first)', default: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Target audience (ALL, NEW_USERS, PREMIUM, etc.)' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({ description: 'Banner image URL' })
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsOptional()
  @IsString()
  termsConditions?: string;

  @ApiProperty({ description: 'Products to include in campaign', type: [CampaignProductDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignProductDto)
  products: CampaignProductDto[];
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CampaignOfferType, description: 'Campaign type' })
  @IsOptional()
  @IsEnum(CampaignOfferType)
  type?: CampaignOfferType;

  @ApiPropertyOptional({ description: 'Campaign start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Campaign end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: CampaignDiscountType, description: 'Discount type' })
  @IsOptional()
  @IsEnum(CampaignDiscountType)
  discountType?: CampaignDiscountType;

  @ApiPropertyOptional({ description: 'Discount value (percentage 0-100 or fixed amount in paise)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ description: 'Maximum discount in paise (for PERCENTAGE type)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Minimum order value in paise to qualify' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({ description: 'Enable limited stock for campaign' })
  @IsOptional()
  @IsBoolean()
  limitedStock?: boolean;

  @ApiPropertyOptional({ description: 'Total stock allocated for campaign' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalStock?: number;

  @ApiPropertyOptional({ description: 'Campaign priority (higher = applied first)' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Target audience (ALL, NEW_USERS, PREMIUM, etc.)' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({ description: 'Banner image URL' })
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsOptional()
  @IsString()
  termsConditions?: string;

  @ApiPropertyOptional({ description: 'Products to include in campaign', type: [CampaignProductDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignProductDto)
  products?: CampaignProductDto[];
}

export class CampaignFilterDto {
  @ApiPropertyOptional({ enum: MarketingCampaignStatus, description: 'Filter by campaign status' })
  @IsOptional()
  @IsEnum(MarketingCampaignStatus)
  status?: MarketingCampaignStatus;

  @ApiPropertyOptional({ enum: CampaignOfferType, description: 'Filter by campaign type' })
  @IsOptional()
  @IsEnum(CampaignOfferType)
  type?: CampaignOfferType;

  @ApiPropertyOptional({ description: 'Filter by active campaigns only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search by campaign name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (default: 20)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
