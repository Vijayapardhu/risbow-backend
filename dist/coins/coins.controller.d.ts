import { CoinsService } from './coins.service';
import { CreditCoinDto, DebitCoinDto } from './dto/coin.dto';
export declare class CoinsController {
    private readonly coinsService;
    constructor(coinsService: CoinsService);
    credit(dto: CreditCoinDto): Promise<{
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
    debit(dto: DebitCoinDto): Promise<{
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
    redeem(req: any, amount: number): Promise<{
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
