import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, IsBoolean, IsNumber, Min, Max, IsJSON } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VendorRole, VendorStatus, KycStatus } from '@prisma/client';

export class UpdateVendorDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    mobile?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    storeName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    storeDescription?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    storeBanner?: string; // Kept for backward compat

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    storeCover?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    storeLogo?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    logo?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    businessName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsEnum(VendorRole)
    role?: VendorRole;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    tier?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    gstNumber?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isGstVerified?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsEnum(KycStatus)
    kycStatus?: KycStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsEnum(VendorStatus)
    storeStatus?: VendorStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    skuLimit?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    commissionRate?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    pincode?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    vendorCode?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    bankDetails?: any;

    @ApiProperty({ required: false })
    @IsOptional()
    storeTimings?: any;

    @ApiProperty({ required: false })
    @IsOptional()
    pickupTimings?: any;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    pickupEnabled?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(1)
    autoClearanceThresholdDays?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    defaultClearanceDiscountPercent?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    rejectionReason?: string;
}
