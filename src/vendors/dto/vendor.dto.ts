import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

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

    // In real app: GSTIN, Pan, etc.
}
