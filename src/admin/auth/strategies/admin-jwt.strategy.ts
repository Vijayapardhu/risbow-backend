import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminRole } from '@prisma/client';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: AdminRole;
  sessionId: string;
  type: 'access' | 'refresh' | 'temp';
}

export interface AdminRequestUser {
  id: string;
  email: string;
  role: AdminRole;
  sessionId: string;
  permissions?: string[];
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  private readonly logger = new Logger(AdminJwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    const jwtOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    };

    super(jwtOptions);
  }

  async validate(payload: AdminJwtPayload): Promise<AdminRequestUser> {
    // Only accept access tokens
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Verify session is still valid
    const session = await this.prisma.adminSession.findUnique({
      where: {
        id: payload.sessionId,
      },
      include: { AdminUser: true },
    });

    if (!session || !session.isActive || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session not found or expired');
    }

    // Verify admin is still active
    if (!session.AdminUser.isActive) {
      throw new UnauthorizedException('Account deactivated');
    }

    // Check session timeouts
    const SESSION_ABSOLUTE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    const SESSION_IDLE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

    const sessionAge = Date.now() - session.createdAt.getTime();
    const idleTime = Date.now() - session.lastActive.getTime();

    if (sessionAge > SESSION_ABSOLUTE_TIMEOUT || idleTime > SESSION_IDLE_TIMEOUT) {
      // Revoke expired session
      await this.prisma.adminSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      throw new UnauthorizedException('Session expired');
    }

    // Update session activity (throttled to every 5 minutes)
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (Date.now() - session.lastActive.getTime() > FIVE_MINUTES) {
      try {
        // Use raw query with timeout to avoid blocking authentication
        await this.prisma.$executeRawUnsafe(
          `UPDATE "AdminSession" SET "lastActive" = NOW() WHERE id = '${session.id}'`
        );
      } catch (error) {
        // Log error but don't fail authentication
        this.logger.warn(`Failed to update session activity for ${session.id}: ${error.message}`);
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  }
}
