
import { IsNotEmpty, IsPhoneNumber, IsString, IsOptional, IsEmail, MinLength, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterVendorDto {
    @ApiProperty({ example: 'John Doe' })
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name: string;

    @ApiProperty({ example: 'vendor@risbow.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Password@123' })
    @IsNotEmpty()
    @IsString()
    password: string;

    @ApiProperty({ example: '9876543210' })
    @IsNotEmpty()
    @IsString()
    mobile: string;

    @ApiProperty({ example: 'Super Electronics' })
    @IsNotEmpty()
    @IsString()
    storeName: string;

    @ApiProperty({ example: 'Best electronics store in Mumbai', required: false })
    @IsOptional()
    @IsString()
    storeDescription?: string;

    @ApiProperty({ example: 'GSTIN12345', required: false })
    @IsOptional()
    @IsString()
    gstNumber?: string;

    @ApiProperty({ example: 'ABCDE1234F' })
    @IsNotEmpty()
    @IsString()
    panNumber: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    isGstRegistered: boolean;

    @ApiProperty({
        example: {
            accountNo: '1234567890',
            ifsc: 'HDFC0001234',
            bankName: 'HDFC Bank',
            holderName: 'John Doe'
        }
    })
    @IsNotEmpty()
    @IsObject()
    bankDetails: any; // Using any for flexibility as it maps to Json

    @ApiProperty({
        example: {
            line1: '123 Shop Lane',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001'
        }
    })
    @IsNotEmpty()
    @IsObject()
    pickupAddress: any; // Using any for flexibility as it maps to Json
}
