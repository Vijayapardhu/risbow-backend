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
    verifyOtp(mobile: string, otp: string): Promise<any>;
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
