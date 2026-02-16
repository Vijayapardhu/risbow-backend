import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VendorRole, KycStatus, VendorStatus, MembershipTier } from '@prisma/client';

export class CreateVendorDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsPhoneNumber('IN')
    mobile: string;

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
    storeLogo?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    logo?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    storeBanner?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    storeCover?: string;

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
    storeDescription?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    pincode?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    gstNumber?: string;

    @ApiProperty({ required: false, enum: VendorRole })
    @IsOptional()
    @IsEnum(VendorRole)
    role?: VendorRole;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    tier?: string;

    @ApiProperty({ required: false, enum: MembershipTier })
    @IsOptional()
    @IsEnum(MembershipTier)
    membershipTier?: MembershipTier;

    @ApiProperty({ required: false, enum: KycStatus })
    @IsOptional()
    @IsEnum(KycStatus)
    kycStatus?: KycStatus;

    @ApiProperty({ required: false, enum: VendorStatus })
    @IsOptional()
    @IsEnum(VendorStatus)
    storeStatus?: VendorStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    commissionRate?: number;
}
