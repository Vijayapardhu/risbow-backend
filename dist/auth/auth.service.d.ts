import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private redisService;
    constructor(prisma: PrismaService, jwtService: JwtService, redisService: RedisService);
    sendOtp(mobile: string): Promise<{
        message: string;
    }>;
    verifyOtp(mobile: string, otp: string): Promise<{
        access_token: string;
        user: {
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
        };
    }>;
}
