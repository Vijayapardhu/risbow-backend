import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: any): Promise<{
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
export {};
