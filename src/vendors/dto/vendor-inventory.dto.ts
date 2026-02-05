import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StockUpdateItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'New stock quantity', minimum: 0 })
  @IsInt()
  @Min(0)
  stock: number;
}

export class BulkStockUpdateDto {
  @ApiProperty({ type: [StockUpdateItemDto], description: 'Array of stock updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockUpdateItemDto)
  updates: StockUpdateItemDto[];
}

export class SingleStockUpdateDto {
  @ApiProperty({ description: 'New stock quantity', minimum: 0 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Reason for stock update' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateThresholdDto {
  @ApiProperty({ description: 'Low stock threshold', minimum: 0 })
  @IsInt()
  @Min(0)
  lowStockThreshold: number;
}

export class InventoryFilterDto {
  @ApiPropertyOptional({ description: 'Filter products with low stock' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lowStock?: boolean;

  @ApiPropertyOptional({ description: 'Filter products that are out of stock' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  outOfStock?: boolean;

  @ApiPropertyOptional({ description: 'Sort order: asc or desc', default: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class InventoryProductDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  currentStock: number;

  @ApiProperty()
  lowStockThreshold: number;

  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] })
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

  @ApiPropertyOptional()
  sku?: string;

  @ApiPropertyOptional()
  categoryName?: string;
}

export class LowStockAlertDto {
  @ApiProperty()
  count: number;

  @ApiProperty({ type: [InventoryProductDto] })
  products: InventoryProductDto[];
}

export class InventorySummaryDto {
  @ApiProperty()
  totalProducts: number;

  @ApiProperty()
  inStockCount: number;

  @ApiProperty()
  lowStockCount: number;

  @ApiProperty()
  outOfStockCount: number;
}

export class CategoryValuationDto {
  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  categoryName: string;

  @ApiProperty()
  totalValue: number;

  @ApiProperty()
  productCount: number;
}

export class InventoryValuationDto {
  @ApiProperty()
  totalValue: number;

  @ApiProperty({ type: [CategoryValuationDto] })
  breakdown: CategoryValuationDto[];
}
