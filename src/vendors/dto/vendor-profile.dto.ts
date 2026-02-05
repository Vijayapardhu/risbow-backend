import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsEmail,
    IsNumber,
    IsBoolean,
    IsObject,
    ValidateNested,
    IsEnum,
    IsDateString,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// Day timing DTO for weekly schedule
export class DayTimingDto {
    @ApiProperty({ example: '09:00' })
    @IsString()
    open: string;

    @ApiProperty({ example: '21:00' })
    @IsString()
    close: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isOpen?: boolean;
}

// Weekly store timings
export class WeeklyTimingsDto {
    @ApiPropertyOptional({ type: DayTimingDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayTimingDto)
    monday?: DayTimingDto;

    @ApiPropertyOptional({ type: DayTimingDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayTimingDto)
    tuesday?: DayTimingDto;

    @ApiPropertyOptional({ type: DayTimingDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayTimingDto)
    wednesday?: DayTimingDto;

    @ApiPropertyOptional({ type: DayTimingDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayTimingDto)
    thursday?: DayTimingDto;

    @ApiPropertyOptional({ type: DayTimingDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayTimingDto)
    friday?: DayTimingDto;

    @ApiPropertyOptional({ type: DayTimingDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayTimingDto)
    saturday?: DayTimingDto;

    @ApiPropertyOptional({ type: DayTimingDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => DayTimingDto)
    sunday?: DayTimingDto;
}

// Update store profile DTO
export class UpdateVendorProfileDto {
    @ApiPropertyOptional({ example: 'My Awesome Store' })
    @IsOptional()
    @IsString()
    storeName?: string;

    @ApiPropertyOptional({ example: 'vendor@example.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 12.9716 })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiPropertyOptional({ example: 77.5946 })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @ApiPropertyOptional({ example: '560001' })
    @IsOptional()
    @IsString()
    pincode?: string;
}

// Update logo DTO
export class UpdateVendorLogoDto {
    @ApiProperty({ example: 'https://cdn.example.com/logos/store-logo.png' })
    @IsString()
    logoUrl: string;
}

// Update banner DTO
export class UpdateVendorBannerDto {
    @ApiProperty({ example: 'https://cdn.example.com/banners/store-banner.png' })
    @IsString()
    bannerUrl: string;
}

// Update business hours DTO
export class UpdateVendorHoursDto {
    @ApiPropertyOptional({ type: WeeklyTimingsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => WeeklyTimingsDto)
    storeTimings?: WeeklyTimingsDto;

    @ApiPropertyOptional({ example: '09:00', description: 'Daily open time (alternative to weekly)' })
    @IsOptional()
    @IsString()
    openTime?: string;

    @ApiPropertyOptional({ example: '21:00', description: 'Daily close time (alternative to weekly)' })
    @IsOptional()
    @IsString()
    closeTime?: string;
}

// Update pickup settings DTO
export class UpdateVendorPickupDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    pickupEnabled: boolean;

    @ApiPropertyOptional({ type: WeeklyTimingsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => WeeklyTimingsDto)
    pickupTimings?: WeeklyTimingsDto;
}

// Store status enum
export enum StoreStatusEnum {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    TEMPORARILY_CLOSED = 'TEMPORARILY_CLOSED',
    ACTIVE = 'ACTIVE',
}

// Update store status DTO
export class UpdateVendorStatusDto {
    @ApiProperty({ enum: StoreStatusEnum, example: 'OPEN' })
    @IsEnum(StoreStatusEnum)
    storeStatus: StoreStatusEnum;

    @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z', description: 'Reopening date for temporary closure' })
    @IsOptional()
    @IsDateString()
    storeClosedUntil?: string;
}

// Response DTOs
export class VendorProfileResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    storeName: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    mobile: string;

    @ApiProperty()
    vendorCode: string;

    @ApiPropertyOptional()
    storeLogo?: string;

    @ApiPropertyOptional()
    storeBanner?: string;

    @ApiPropertyOptional()
    storeTimings?: object;

    @ApiPropertyOptional()
    storeStatus?: string;

    @ApiPropertyOptional()
    latitude?: number;

    @ApiPropertyOptional()
    longitude?: number;

    @ApiPropertyOptional()
    pincode?: string;

    @ApiProperty()
    pickupEnabled: boolean;

    @ApiPropertyOptional()
    pickupTimings?: object;

    @ApiProperty()
    performanceScore: number;

    @ApiProperty()
    followCount: number;

    @ApiProperty()
    tier: string;

    @ApiProperty()
    kycStatus: string;

    @ApiPropertyOptional()
    gstNumber?: string;

    @ApiProperty()
    isGstVerified: boolean;
}

export class PublicVendorProfileResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    storeName: string;

    @ApiPropertyOptional()
    storeLogo?: string;

    @ApiPropertyOptional()
    storeBanner?: string;

    @ApiProperty()
    vendorCode: string;

    @ApiPropertyOptional()
    storeTimings?: object;

    @ApiProperty()
    storeStatus: string;

    @ApiProperty()
    pickupEnabled: boolean;

    @ApiProperty()
    performanceScore: number;

    @ApiProperty()
    followCount: number;

    @ApiProperty()
    tier: string;

    @ApiPropertyOptional()
    latitude?: number;

    @ApiPropertyOptional()
    longitude?: number;

    @ApiPropertyOptional()
    pincode?: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    productCount: number;

    @ApiProperty()
    reviewCount: number;
}
