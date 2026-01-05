
import { IsNotEmpty, IsPhoneNumber, IsString, IsOptional } from 'class-validator';

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
