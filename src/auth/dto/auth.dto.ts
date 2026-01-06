
import { IsNotEmpty, IsPhoneNumber, IsString, IsOptional, IsEmail, MinLength, IsObject, IsDateString } from 'class-validator';

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
    otp: string;
}

export class RegisterDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
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
