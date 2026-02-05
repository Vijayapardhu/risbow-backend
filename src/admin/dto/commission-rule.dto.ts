import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionScope } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommissionRuleDto {
  @ApiProperty({ enum: CommissionScope })
  @IsEnum(CommissionScope)
  scope: CommissionScope;

  @ApiProperty({ example: 0.12 })
  @IsNumber()
  @Min(0)
  @Max(0.8)
  commissionRate: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: 'vendor_id' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'category_id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'product_id' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ example: 'Promo override' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateCommissionRuleDto {
  @ApiProperty({ example: 'rule_id' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({ enum: CommissionScope })
  @IsOptional()
  @IsEnum(CommissionScope)
  scope?: CommissionScope;

  @ApiPropertyOptional({ example: 0.12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.8)
  commissionRate?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: 'vendor_id' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'category_id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'product_id' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ example: 'Promo override' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListCommissionRulesQueryDto {
  @ApiPropertyOptional({ enum: CommissionScope })
  @IsOptional()
  @IsEnum(CommissionScope)
  scope?: CommissionScope;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'vendor_id' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'category_id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'product_id' })
  @IsOptional()
  @IsString()
  productId?: string;
}

