import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class AdminCreateUserDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    mobile: string;

    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password: string;
}

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsString()
    @IsOptional()
    gender?: string;

    @IsString()
    @IsOptional()
    size?: string;

    @IsOptional()
    footwearSize?: number;

    @IsString()
    @IsOptional()
    stylePrefs?: string;

    @IsString()
    @IsOptional()
    colors?: string;
}

export class ReferralClaimDto {
    @IsString()
    refCode: string;
}
