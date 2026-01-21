
import { IsNotEmpty, IsPhoneNumber, IsString, IsOptional, IsEmail, MinLength, IsObject, IsDateString, IsStrongPassword, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
    @ApiProperty({ example: '9988776655', description: 'Indian mobile number' })
    @IsNotEmpty()
    @IsPhoneNumber('IN')
    mobile: string;
}

export class VerifyOtpDto {
    @ApiProperty({ example: '9988776655' })
    @IsNotEmpty()
    @IsPhoneNumber('IN')
    mobile: string;

    @ApiProperty({ example: '123456', description: '6-digit OTP' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
    otp: string;
}

export class RegisterDto {
    @ApiProperty({ example: 'John Doe' })
    @IsNotEmpty()
    @IsString()
    @MinLength(2, { message: 'Name must be at least 2 characters' })
    name: string;

    @ApiProperty({ example: 'user@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Password@123', description: 'Min 8 chars, 1 Upper, 1 Lower, 1 Number' })
    @IsNotEmpty()
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 0,
    }, { message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number' })
    password: string;

    @ApiProperty({ example: '9876543210' })
    @IsNotEmpty()
    @IsString()
    phone: string;

    @ApiProperty({
        example: {
            line1: '123 Main St',
            line2: 'Apt 4B',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India'
        }
    })
    @IsNotEmpty()
    @IsObject()
    address: {
        line1: string;
        line2: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };

    @ApiProperty({ example: '1990-01-01', description: 'ISO Date String' })
    @IsNotEmpty()
    @IsDateString()
    dateOfBirth: string;

    @ApiProperty({ example: 'Male', enum: ['Male', 'Female', 'Other'] })
    @IsNotEmpty()
    @IsString()
    gender: string;
}

export class LoginDto {
    @ApiProperty({ example: 'admin@risbow.com', description: 'Admin email for testing' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Password@123', description: 'Valid password' })
    @IsNotEmpty()
    @IsString()
    password: string;
}
