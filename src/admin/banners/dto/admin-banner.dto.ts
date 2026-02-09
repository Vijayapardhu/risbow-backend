import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, IsInt, IsEnum, Min, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export enum BannerSlot {
  HOME_TOP = 'HOME_TOP',
  HOME_MIDDLE = 'HOME_MIDDLE',
  CATEGORY_TOP = 'CATEGORY_TOP',
  PRODUCT_SIDEBAR = 'PRODUCT_SIDEBAR',
  CHECKOUT = 'CHECKOUT',
}

export enum BannerDevice {
  ALL = 'ALL',
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
}

export class CreateBannerDto {
  @ApiProperty({ example: 'Summer Sale Banner', description: 'Banner title' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'https://cdn.example.com/banner-desktop.png', description: 'Desktop banner image URL' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner-mobile.png', description: 'Mobile banner image URL (optional)' })
  @IsOptional()
  @IsUrl()
  mobileImageUrl?: string;

  @ApiPropertyOptional({ example: 'https://risbow.com/sale', description: 'Link URL when banner is clicked' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiProperty({ example: 'HOME_TOP', enum: BannerSlot, description: 'Banner placement slot' })
  @IsEnum(BannerSlot)
  slot: BannerSlot;

  @ApiProperty({ example: 'ALL', enum: BannerDevice, description: 'Target device type' })
  @IsEnum(BannerDevice)
  device: BannerDevice;

  @ApiPropertyOptional({ example: 1, description: 'Priority order (1 = highest)', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ example: true, description: 'Is banner active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-01-22', description: 'Start date (optional)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-01-30', description: 'End date (optional)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateBannerDto {
  @ApiPropertyOptional({ example: 'Summer Sale Banner Updated' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner-desktop-new.png' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner-mobile-new.png' })
  @IsOptional()
  @IsUrl()
  mobileImageUrl?: string;

  @ApiPropertyOptional({ example: 'https://risbow.com/new-sale' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ example: 'HOME_TOP', enum: BannerSlot })
  @IsOptional()
  @IsEnum(BannerSlot)
  slot?: BannerSlot;

  @ApiPropertyOptional({ example: 'ALL', enum: BannerDevice })
  @IsOptional()
  @IsEnum(BannerDevice)
  device?: BannerDevice;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-02-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-02-28' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ToggleBannerStatusDto {
  @ApiProperty({ example: true, description: 'New active status' })
  @IsBoolean()
  isActive: boolean;
}

export class BannerResponseDto {
  @ApiProperty({ example: 'banner_123' })
  id: string;

  @ApiProperty({ example: 'Summer Sale Banner' })
  title: string;

  @ApiProperty({ example: 'https://cdn.example.com/banner-desktop.png' })
  imageUrl: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner-mobile.png' })
  mobileImageUrl?: string;

  @ApiPropertyOptional({ example: 'https://risbow.com/sale' })
  linkUrl?: string;

  @ApiProperty({ example: 'HOME_TOP', enum: BannerSlot })
  slot: BannerSlot;

  @ApiProperty({ example: 'ALL', enum: BannerDevice })
  device: BannerDevice;

  @ApiProperty({ example: 1 })
  priority: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2026-01-22T00:00:00.000Z' })
  startDate?: Date;

  @ApiPropertyOptional({ example: '2026-01-30T23:59:59.000Z' })
  endDate?: Date;

  @ApiProperty({ example: 0 })
  clicks: number;

  @ApiProperty({ example: 0 })
  impressions: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BannerListResponseDto {
  @ApiProperty({ type: [BannerResponseDto] })
  data: BannerResponseDto[];

  @ApiProperty({ example: { total: 10, page: 1, limit: 10, totalPages: 1 } })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class BannerStatsDto {
  @ApiProperty({ example: 10 })
  totalBanners: number;

  @ApiProperty({ example: 5 })
  activeBanners: number;

  @ApiProperty({ example: 1000 })
  totalClicks: number;

  @ApiProperty({ example: 5000 })
  totalImpressions: number;
}

export class BannerQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 'HOME_TOP', enum: BannerSlot, description: 'Filter by slot' })
  @IsOptional()
  @IsEnum(BannerSlot)
  slot?: BannerSlot;

  @ApiPropertyOptional({ example: 'true', description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'sale', description: 'Search by title' })
  @IsOptional()
  @IsString()
  search?: string;
}
