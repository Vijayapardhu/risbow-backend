import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateRoomDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsInt()
    @Min(2)
    size: number; // e.g. 3 or 4

    @IsNotEmpty()
    @IsInt()
    unlockMinOrders: number;

    @IsNotEmpty()
    @IsInt()
    unlockMinValue: number;
}

export class JoinRoomDto {
    // Mostly just ID in param, potentially referral code here
}
