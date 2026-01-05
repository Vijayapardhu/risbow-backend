import { IsEnum, IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export enum CoinSource {
    REFERRAL = 'REFERRAL',
    ORDER_REWARD = 'ORDER_REWARD',
    ADMIN_CREDIT = 'ADMIN_CREDIT',
    SPEND_ORDER = 'SPEND_ORDER',
    BANNER_PURCHASE = 'BANNER_PURCHASE',
}

export class CreditCoinDto {
    @IsNotEmpty()
    @IsUUID()
    userId: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    amount: number;

    @IsNotEmpty()
    @IsEnum(CoinSource)
    source: CoinSource;
}

export class DebitCoinDto {
    @IsNotEmpty()
    @IsUUID()
    userId: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    amount: number;

    @IsNotEmpty()
    @IsEnum(CoinSource)
    source: CoinSource;
}
