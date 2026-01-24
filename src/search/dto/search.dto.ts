import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOption {
  RELEVANCE = 'relevance',
  PRICE_LOW = 'price_low',
  PRICE_HIGH = 'price_high',
  RATING = 'rating',
  NEWEST = 'newest'
}

export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Search query string' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filter to only in-stock items' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  inStock?: boolean;

  @ApiPropertyOptional({ enum: SortOption, description: 'Sort order for results' })
  @IsEnum(SortOption)
  @IsOptional()
  sort?: SortOption = SortOption.RELEVANCE;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Results per page (max 100)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'User region for trending bias' })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ description: 'Latitude for geo region bucketing (preferred over region string)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude for geo region bucketing (preferred over region string)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ description: 'Pincode for region bucketing (fallback if lat/lng not provided)' })
  @IsString()
  @IsOptional()
  pincode?: string;
}

export class AutocompleteDto {
  @ApiProperty({ description: 'Search prefix for autocomplete' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: 'Maximum suggestions to return' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'User region for trending bias' })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ description: 'Latitude for geo region bucketing' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude for geo region bucketing' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ description: 'Pincode for region bucketing' })
  @IsString()
  @IsOptional()
  pincode?: string;
}

export class TrendingQueryDto {
  @ApiPropertyOptional({ description: 'Region for trending data', default: 'global' })
  @IsString()
  @IsOptional()
  region?: string = 'global';

  @ApiPropertyOptional({ description: 'Time period: 24h or 7d', enum: ['24h', '7d'], default: '24h' })
  @IsString()
  @IsOptional()
  period?: '24h' | '7d' = '24h';

  @ApiPropertyOptional({ description: 'Maximum results to return' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}

export class MissAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Time period: 24h, 7d, or 30d', enum: ['24h', '7d', '30d'], default: '7d' })
  @IsString()
  @IsOptional()
  period?: '24h' | '7d' | '30d' = '7d';

  @ApiPropertyOptional({ description: 'Maximum results to return' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}

export class ResolveMissDto {
  @ApiProperty({ description: 'ID of the search miss to resolve' })
  @IsString()
  missId: string;

  @ApiProperty({ description: 'ID of the product that resolves this search' })
  @IsString()
  productId: string;
}
