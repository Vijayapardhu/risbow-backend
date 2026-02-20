import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../shared/cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);
    
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
        private cacheService: CacheService,
    ) {
        const secret = configService.get<string>('JWT_SECRET');

        const jwtOptions = {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        };

        super(jwtOptions);
    }

    async validate(payload: any) {
        // Reject non-access tokens (e.g., refresh tokens used as access tokens)
        if (payload.type && payload.type !== 'access') {
            throw new UnauthorizedException('Invalid token type');
        }

        // Check if token has been blacklisted (user logged out)
        const isBlacklisted = await this.cacheService.get<string>(`token:blacklist:${payload.sub}:${payload.iat}`);
        if (isBlacklisted) {
            throw new UnauthorizedException('Token has been revoked');
        }

        // Check force logout timestamp
        const forceLogoutCheck = await this.cacheService.get<string>(`force_logout:${payload.sub}`);
        if (forceLogoutCheck && payload.iat && parseInt(forceLogoutCheck) > payload.iat) {
            throw new UnauthorizedException('Session has been invalidated');
        }

        // Use cache-aside pattern for user lookup
        const user = await this.cacheService.getUserAuth(payload.sub, async () => {
            const dbUser = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: {
                    id: true,
                    email: true,
                    mobile: true,
                    role: true,
                    status: true,
                    name: true,
                    forceLogoutAt: true,
                }
            });
            
            if (!dbUser) {
                throw new UnauthorizedException('User not found');
            }
            
            return dbUser;
        }, 300);

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
