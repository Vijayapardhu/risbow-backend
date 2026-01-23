import { IsInt, IsNotEmpty, IsString, Min, Max, MaxLength } from 'class-validator';

export class CreateRoomDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    name: string;

    @IsNotEmpty()
    @IsInt()
    @Min(2)
    @Max(10) // Standard maximum for social commerce rooms
    size: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    unlockMinOrders: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    unlockMinValue: number;
}

export class CreateDiscountRoomDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    name: string;

    @IsNotEmpty()
    @IsString()
    productId: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Max(100)
    maxDiscount: number;

    @IsNotEmpty()
    @IsInt()
    @Min(2)
    @Max(20)
    maxMembers: number;
}

export class JoinRoomDto {
    // Mostly just ID in param, potentially referral code here
}
