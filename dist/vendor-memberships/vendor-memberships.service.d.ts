import { PrismaService } from '../prisma/prisma.service';
import { SubscribeMembershipDto, UpgradeMembershipDto, MembershipTierResponseDto, CurrentMembershipResponseDto } from './dto/membership.dto';
export declare class VendorMembershipsService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly TIER_CONFIGS;
    getAllTiers(): Promise<MembershipTierResponseDto[]>;
    subscribe(vendorId: string, dto: SubscribeMembershipDto): Promise<CurrentMembershipResponseDto>;
    upgrade(vendorId: string, dto: UpgradeMembershipDto): Promise<CurrentMembershipResponseDto>;
    getCurrentMembership(vendorId: string): Promise<CurrentMembershipResponseDto>;
    cancelAutoRenewal(vendorId: string): Promise<{
        message: string;
        endDate: Date;
    }>;
}
