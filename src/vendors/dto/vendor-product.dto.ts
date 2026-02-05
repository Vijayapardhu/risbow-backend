import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProductVisibility } from '@prisma/client';

export class CreateVendorProductDto {
  @ApiProperty({ description: 'Product title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Product price in paise' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Offer price in paise' })
  @IsOptional()
  @IsInt()
  @Min(0)
  offerPrice?: number;

  @ApiProperty({ description: 'Stock quantity' })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ description: 'Category ID' })
  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Product images URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Unique SKU' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Brand name' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ description: 'Is wholesale product' })
  @IsOptional()
  @IsBoolean()
  isWholesale?: boolean;

  @ApiPropertyOptional({ description: 'Wholesale price in paise' })
  @IsOptional()
  @IsInt()
  @Min(0)
  wholesalePrice?: number;

  @ApiPropertyOptional({ description: 'Minimum order quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  moq?: number;

  @ApiPropertyOptional({ description: 'Cost price in paise' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Product weight' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Weight unit (kg, g)' })
  @IsOptional()
  @IsString()
  weightUnit?: string;

  @ApiPropertyOptional({ description: 'Product length' })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ description: 'Product width' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Product height' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Dimension unit (cm, inch)' })
  @IsOptional()
  @IsString()
  dimensionUnit?: string;

  @ApiPropertyOptional({ description: 'Product tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Meta title for SEO' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description for SEO' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Meta keywords for SEO' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({ description: 'Product visibility', enum: ProductVisibility })
  @IsOptional()
  @IsEnum(ProductVisibility)
  visibility?: ProductVisibility;

  @ApiPropertyOptional({ description: 'Is product returnable' })
  @IsOptional()
  @IsBoolean()
  isReturnable?: boolean;

  @ApiPropertyOptional({ description: 'Is product cancelable' })
  @IsOptional()
  @IsBoolean()
  isCancelable?: boolean;

  @ApiPropertyOptional({ description: 'Total allowed quantity per order' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalAllowedQuantity?: number;

  @ApiPropertyOptional({ description: 'Minimum order quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQuantity?: number;

  @ApiPropertyOptional({ description: 'Quantity step size' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantityStepSize?: number;

  @ApiPropertyOptional({ description: 'Base preparation time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  basePreparationTime?: number;

  @ApiPropertyOptional({ description: 'Product attributes as JSON' })
  @IsOptional()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Storage instructions' })
  @IsOptional()
  @IsString()
  storageInstructions?: string;

  @ApiPropertyOptional({ description: 'Allergen information' })
  @IsOptional()
  @IsString()
  allergenInformation?: string;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  expiryDate?: Date;
}

export class UpdateVendorProductDto extends PartialType(CreateVendorProductDto) {}

export class UpdateStockDto {
  @ApiProperty({ description: 'New stock quantity' })
  @IsInt()
  @Min(0)
  stock: number;
}

export class VendorProductQueryDto {
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
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Category ID filter' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Visibility filter', enum: ProductVisibility })
  @IsOptional()
  @IsEnum(ProductVisibility)
  visibility?: ProductVisibility;

  @ApiPropertyOptional({ description: 'Is active filter' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
