import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsBoolean, IsOptional, IsString } from 'class-validator';
import { MembershipTier, PayoutCycle } from '@prisma/client';

export class SubscribeMembershipDto {
    @ApiProperty({
        enum: MembershipTier,
        description: 'Membership tier to subscribe to',
        example: 'BASIC',
    })
    @IsEnum(MembershipTier)
    tier: MembershipTier;

    @ApiProperty({
        description: 'Payment method: COINS or MONEY',
        example: 'MONEY',
        enum: ['COINS', 'MONEY'],
    })
    @IsString()
    paymentMethod: 'COINS' | 'MONEY';

    @ApiProperty({
        description: 'Auto-renew subscription',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    autoRenew?: boolean;
}

export class UpgradeMembershipDto {
    @ApiProperty({
        enum: MembershipTier,
        description: 'New membership tier',
        example: 'PRO',
    })
    @IsEnum(MembershipTier)
    newTier: MembershipTier;
}

export class MembershipTierResponseDto {
    @ApiProperty({ example: 'FREE' })
    tier: MembershipTier;

    @ApiProperty({ example: 0, description: 'Monthly price in rupees' })
    price: number;

    @ApiProperty({ example: 10, description: 'Maximum SKUs allowed' })
    skuLimit: number;

    @ApiProperty({ example: 3, description: 'Maximum images per SKU' })
    imageLimit: number;

    @ApiProperty({ example: 0.15, description: 'Commission rate (0.15 = 15%)' })
    commissionRate: number;

    @ApiProperty({ example: 'MONTHLY', enum: PayoutCycle })
    payoutCycle: PayoutCycle;

    @ApiProperty({
        example: {
            prioritySupport: false,
            analytics: false,
            bulkUpload: false,
            promotions: false,
        },
        description: 'Tier features',
    })
    features: Record<string, boolean>;
}

export class CurrentMembershipResponseDto {
    @ApiProperty({ example: 'cm1234567890' })
    id: string;

    @ApiProperty({ example: 'BASIC', enum: MembershipTier })
    tier: MembershipTier;

    @ApiProperty({ example: 999, description: 'Monthly price in rupees' })
    price: number;

    @ApiProperty({ example: 100 })
    skuLimit: number;

    @ApiProperty({ example: 5 })
    imageLimit: number;

    @ApiProperty({ example: 0.12 })
    commissionRate: number;

    @ApiProperty({ example: 'WEEKLY', enum: PayoutCycle })
    payoutCycle: PayoutCycle;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: true })
    autoRenew: boolean;

    @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
    startDate: Date;

    @ApiProperty({ example: '2024-02-15T00:00:00.000Z', nullable: true })
    endDate: Date | null;

    @ApiProperty({
        example: {
            currentSkus: 45,
            remainingSkus: 55,
            usagePercentage: 45,
        },
        description: 'Usage statistics',
    })
    usage: {
        currentSkus: number;
        remainingSkus: number;
        usagePercentage: number;
    };
}
