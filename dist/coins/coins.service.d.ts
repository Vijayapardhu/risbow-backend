import { PrismaService } from '../prisma/prisma.service';
import { CoinSource } from './dto/coin.dto';
export declare class CoinsService {
    private prisma;
    constructor(prisma: PrismaService);
    getBalance(userId: string): Promise<{
        balance: number;
    }>;
    getLedger(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        amount: number;
        source: string;
        expiresAt: Date | null;
    }[]>;
    credit(userId: string, amount: number, source: CoinSource): Promise<{
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
    debit(userId: string, amount: number, source: CoinSource): Promise<{
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
