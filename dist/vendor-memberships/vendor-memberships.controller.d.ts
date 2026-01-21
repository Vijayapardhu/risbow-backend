import { VendorMembershipsService } from './vendor-memberships.service';
import { SubscribeMembershipDto, UpgradeMembershipDto, MembershipTierResponseDto, CurrentMembershipResponseDto } from './dto/membership.dto';
export declare class VendorMembershipsController {
    private readonly membershipService;
    constructor(membershipService: VendorMembershipsService);
    getAllTiers(): Promise<MembershipTierResponseDto[]>;
    subscribe(req: any, dto: SubscribeMembershipDto): Promise<CurrentMembershipResponseDto>;
    upgrade(req: any, dto: UpgradeMembershipDto): Promise<CurrentMembershipResponseDto>;
    getCurrentMembership(req: any): Promise<CurrentMembershipResponseDto>;
    cancelAutoRenewal(req: any): Promise<{
        message: string;
        endDate: Date;
    }>;
    cancel(req: any): Promise<{
        message: string;
        endDate: Date;
    }>;
}
