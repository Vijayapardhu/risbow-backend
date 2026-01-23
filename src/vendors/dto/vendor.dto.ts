import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { MembershipTier } from '@prisma/client';

export class RegisterVendorDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsPhoneNumber('IN')
    mobile: string;

    @IsOptional()
    @IsEmail()
    email?: string;
    @IsOptional()
    @IsString()
    role?: string; // RETAILER | WHOLESALER

    @IsOptional()
    @IsEnum(MembershipTier)
    tier?: MembershipTier;

    // In real app: GSTIN, Pan, etc.
    @IsOptional()
    @IsString()
    pan?: string;

    @IsOptional()
    @IsString()
    gst?: string;

    @IsOptional()
    @IsString()
    bankAccount?: string;

    @IsOptional()
    @IsString()
    bankIfsc?: string;

    @IsOptional()
    @IsString()
    kycStatus?: string; // PENDING | VERIFIED | REJECTED
}
