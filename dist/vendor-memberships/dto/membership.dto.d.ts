import { MembershipTier, PayoutCycle } from '@prisma/client';
export declare class SubscribeMembershipDto {
    tier: MembershipTier;
    paymentMethod: 'COINS' | 'MONEY';
    autoRenew?: boolean;
}
export declare class UpgradeMembershipDto {
    newTier: MembershipTier;
}
export declare class MembershipTierResponseDto {
    tier: MembershipTier;
    price: number;
    skuLimit: number;
    imageLimit: number;
    commissionRate: number;
    payoutCycle: PayoutCycle;
    features: Record<string, boolean>;
}
export declare class CurrentMembershipResponseDto {
    id: string;
    tier: MembershipTier;
    price: number;
    skuLimit: number;
    imageLimit: number;
    commissionRate: number;
    payoutCycle: PayoutCycle;
    isActive: boolean;
    autoRenew: boolean;
    startDate: Date;
    endDate: Date | null;
    usage: {
        currentSkus: number;
        remainingSkus: number;
        usagePercentage: number;
    };
}
