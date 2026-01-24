import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateLocalPromotionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'RADIUS or PINCODE_SET', example: 'RADIUS' })
  @IsString()
  @IsNotEmpty()
  targetType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  centerLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'For PINCODE_SET target', example: ['500001', '500002'] })
  @IsOptional()
  pincodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Percent off 1..100' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  @ApiPropertyOptional({ description: 'Flat off (same unit as price fields)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  flatOffAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  freeShipping?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  boostOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateLocalPromotionDto extends CreateLocalPromotionDto {}

