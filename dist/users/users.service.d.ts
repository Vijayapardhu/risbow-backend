import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(id: string): Promise<{
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
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
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
    claimReferral(userId: string, refCode: string): Promise<{
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
