import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BannerMetadataDto {
    @ApiProperty({ example: 'CAROUSEL', description: 'Exact placement inside the page' })
    slotKey: string;

    @ApiProperty({ example: 1, description: 'Position order (0-based)' })
    slotIndex: number;

    @ApiPropertyOptional({ example: 100, description: 'Priority (higher = more important)' })
    priority?: number;

    @ApiPropertyOptional({ example: true, description: 'Is this a paid banner' })
    isPaid?: boolean;

    @ApiPropertyOptional({ example: 'COINS', description: 'Payment method used' })
    paymentMethod?: string;

    @ApiPropertyOptional({ example: 'COMPLETED', description: 'Payment status' })
    paymentStatus?: string;

    @ApiPropertyOptional({ example: 350000, description: 'Cost in paise' })
    costInPaise?: number;

    @ApiPropertyOptional({ example: 3500, description: 'Cost in coins' })
    costInCoins?: number;

    @ApiPropertyOptional({ description: 'Analytics data' })
    analytics?: {
        impressions?: number;
        clicks?: number;
    };
}

export class CreateBannerDto {
    @ApiProperty({ example: 'https://cdn.example.com/banner.png', description: 'Banner image URL' })
    @IsString()
    imageUrl: string;

    @ApiPropertyOptional({ example: '/category/mobiles', description: 'Redirect URL or deep link' })
    @IsOptional()
    @IsString()
    redirectUrl?: string;

    @ApiProperty({ example: 'HOME', enum: ['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART'], description: 'Page identifier' })
    @IsEnum(['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART'])
    slotType: string;

    @ApiProperty({ example: '2026-01-22T00:00:00Z', description: 'Start date' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2026-01-30T23:59:59Z', description: 'End date' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ example: 'CAROUSEL', description: 'Exact placement key' })
    @IsString()
    slotKey: string;

    @ApiProperty({ example: 1, description: 'Position index' })
    @IsInt()
    @Min(0)
    slotIndex: number;

    @ApiPropertyOptional({ example: 100, description: 'Priority level' })
    @IsOptional()
    @IsInt()
    @Min(0)
    priority?: number;

    @ApiPropertyOptional({ example: true, description: 'Is banner active' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateBannerDto {
    @ApiPropertyOptional({ example: 'https://cdn.example.com/banner-updated.png' })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiPropertyOptional({ example: '/category/electronics' })
    @IsOptional()
    @IsString()
    redirectUrl?: string;

    @ApiPropertyOptional({ example: '2026-02-28T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ example: 2 })
    @IsOptional()
    @IsInt()
    @Min(0)
    slotIndex?: number;

    @ApiPropertyOptional({ example: 150 })
    @IsOptional()
    @IsInt()
    @Min(0)
    priority?: number;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class PurchaseBannerDto {
    @ApiProperty({ example: 'HOME', enum: ['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART'] })
    @IsEnum(['HOME', 'CATEGORY', 'SEARCH', 'PRODUCT', 'CART'])
    slotType: string;

    @ApiProperty({ example: 'CAROUSEL' })
    @IsString()
    slotKey: string;

    @ApiProperty({ example: 2 })
    @IsInt()
    @Min(0)
    slotIndex: number;

    @ApiProperty({ example: 7, description: 'Duration in days' })
    @IsInt()
    @Min(1)
    durationDays: number;

    @ApiProperty({ example: 'COINS', enum: ['COINS', 'RUPEES'], description: 'Payment method' })
    @IsEnum(['COINS', 'RUPEES'])
    paymentMethod: 'COINS' | 'RUPEES';
}

export class UploadBannerCreativeDto {
    @ApiProperty({ example: 'banner_purchase_123', description: 'Banner purchase ID' })
    @IsString()
    bannerId: string;

    @ApiProperty({ example: 'https://cdn.example.com/vendor-banner.png' })
    @IsString()
    imageUrl: string;

    @ApiPropertyOptional({ example: '/vendor/store/123' })
    @IsOptional()
    @IsString()
    redirectUrl?: string;
}

export class TrackBannerDto {
    @ApiProperty({ example: 'CLICK', enum: ['IMPRESSION', 'CLICK'], description: 'Event type' })
    @IsEnum(['IMPRESSION', 'CLICK'])
    event: string;
}

export class BannerResponseDto {
    @ApiProperty({ example: 'banner_123' })
    id: string;

    @ApiPropertyOptional({ example: 'vendor_123' })
    vendorId?: string;

    @ApiProperty({ example: 'https://cdn.example.com/banner.png' })
    imageUrl: string;

    @ApiPropertyOptional({ example: '/category/mobiles' })
    redirectUrl?: string;

    @ApiProperty({ example: 'HOME' })
    slotType: string;

    @ApiProperty()
    startDate: Date;

    @ApiProperty()
    endDate: Date;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ type: BannerMetadataDto })
    metadata: BannerMetadataDto;

    @ApiProperty()
    createdAt: Date;
}

export class GetActiveBannersQueryDto {
    @ApiProperty({ example: 'HOME', description: 'Page identifier' })
    @IsString()
    slotType: string;

    @ApiPropertyOptional({ example: 'CAROUSEL', description: 'Exact placement key' })
    @IsOptional()
    @IsString()
    slotKey?: string;
}
