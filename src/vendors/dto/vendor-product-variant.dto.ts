import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @ApiPropertyOptional({ description: 'Variant name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Variant attributes (color, size, material, etc.)',
    example: { color: 'Red', size: 'XL' },
  })
  @IsNotEmpty()
  @IsObject()
  attributes: Record<string, string>;

  @ApiPropertyOptional({ description: 'Variant price in paise' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Variant offer price in paise' })
  @IsOptional()
  @IsInt()
  @Min(0)
  offerPrice?: number;

  @ApiProperty({ description: 'Variant stock quantity' })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Unique SKU for this variant' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Variant images URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Is variant active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductVariantDto extends PartialType(
  CreateProductVariantDto,
) {}

export class BulkCreateVariantsDto {
  @ApiProperty({
    description: 'Array of variants to create',
    type: [CreateProductVariantDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];
}

export class ProductVariantQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by low stock (less than value)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lowStock?: number;
}
