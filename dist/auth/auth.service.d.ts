import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private redisService;
    private supabase;
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
            password: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            coinsBalance: number;
            referredBy: string | null;
            dateOfBirth: Date | null;
            gender: string | null;
            size: string | null;
            footwearSize: number | null;
            stylePrefs: string | null;
            colors: string | null;
            createdAt: Date;
        };
    }>;
    registerWithEmail(registerDto: any): Promise<{
        access_token: string;
        user: any;
    }>;
    loginWithEmail(email: string, password: string): Promise<{
        access_token: string;
        user: any;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
}
