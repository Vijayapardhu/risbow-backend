import { IsString, IsOptional, IsEmail } from 'class-validator';

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
