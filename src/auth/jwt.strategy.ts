import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
        import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
        private redisService: RedisService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: any) {
        // Check if token has been blacklisted (user logged out)
        const isBlacklisted = await this.redisService.get(`token:blacklist:${payload.sub}:${payload.iat}`);
        if (isBlacklisted) {
            throw new UnauthorizedException('Token has been revoked');
        }

        // Check force logout timestamp
        const forceLogoutCheck = await this.redisService.get(`force_logout:${payload.sub}`);
        if (forceLogoutCheck && payload.iat && parseInt(forceLogoutCheck) > payload.iat) {
            throw new UnauthorizedException('Session has been invalidated');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });
        
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Validate user account status
        if (user.status === 'BANNED') {
            throw new UnauthorizedException('Account has been banned');
        }
        
        if (user.status === 'SUSPENDED') {
            throw new UnauthorizedException('Account has been suspended');
        }

        // Check if forceLogoutAt is set and token was issued before that
        if (user.forceLogoutAt && payload.iat) {
            const tokenIssuedAt = payload.iat * 1000; // Convert to milliseconds
            const forceLogoutTime = new Date(user.forceLogoutAt).getTime();
            if (tokenIssuedAt < forceLogoutTime) {
                throw new UnauthorizedException('Session has been invalidated');
            }
        }

        // Return only necessary fields to reduce payload size
        return {
            id: user.id,
            email: user.email,
            mobile: user.mobile,
            role: user.role,
            status: user.status,
            name: user.name,
        };
    }
}
