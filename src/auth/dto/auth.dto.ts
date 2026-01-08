
import { IsNotEmpty, IsPhoneNumber, IsString, IsOptional, IsEmail, MinLength, IsObject, IsDateString, IsStrongPassword, Matches } from 'class-validator';

export class SendOtpDto {
    @IsNotEmpty()
    @IsPhoneNumber('IN')
    mobile: string;
}

export class VerifyOtpDto {
    @IsNotEmpty()
    @IsPhoneNumber('IN')
    mobile: string;

    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
    otp: string;
}

export class RegisterDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2, { message: 'Name must be at least 2 characters' })
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 0, // Optional for better UX
    }, { message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number' })
    password: string;

    @IsNotEmpty()
    @IsString()
    phone: string;

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

    @IsNotEmpty()
    @IsDateString()
    dateOfBirth: string;

    @IsNotEmpty()
    @IsString()
    gender: string;
}

export class LoginDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}
