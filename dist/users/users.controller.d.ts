import { UsersService } from './users.service';
import { UpdateUserDto, ReferralClaimDto } from './dto/user.dto';
import { CoinsService } from '../coins/coins.service';
export declare class UsersController {
    private readonly usersService;
    private readonly coinsService;
    constructor(usersService: UsersService, coinsService: CoinsService);
    getProfile(req: any): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        coinsBalance: number;
        referredBy: string | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        createdAt: Date;
    }>;
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        coinsBalance: number;
        referredBy: string | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        createdAt: Date;
    }>;
    getCoins(req: any): Promise<{
        ledger: {
            id: string;
            createdAt: Date;
            userId: string;
            amount: number;
            source: string;
            expiresAt: Date | null;
        }[];
        balance: number;
    }>;
}
export declare class ReferralsController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getReferralInfo(req: any): Promise<{
        referralCode: string;
    }>;
    claimReferral(req: any, dto: ReferralClaimDto): Promise<{
        id: string;
        mobile: string;
        email: string | null;
        referralCode: string;
        name: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        coinsBalance: number;
        referredBy: string | null;
        gender: string | null;
        size: string | null;
        footwearSize: number | null;
        stylePrefs: string | null;
        colors: string | null;
        createdAt: Date;
    }>;
}
