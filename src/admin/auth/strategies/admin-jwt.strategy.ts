import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminRequestUser> {
    // Only accept access tokens
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Verify session is still valid
    const session = await this.prisma.adminSession.findFirst({
      where: {
        id: payload.sessionId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { Admin: true },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found or expired');
    }

    // Verify admin is still active
    if (!session.admin.isActive) {
      throw new UnauthorizedException('Account deactivated');
    }

    // Check session timeouts
    const SESSION_ABSOLUTE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    const SESSION_IDLE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

    const sessionAge = Date.now() - session.createdAt.getTime();
    const idleTime = Date.now() - session.lastActiveAt.getTime();

    if (sessionAge > SESSION_ABSOLUTE_TIMEOUT || idleTime > SESSION_IDLE_TIMEOUT) {
      // Revoke expired session
      await this.prisma.adminSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Session expired');
    }

    // Update session activity
    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  }
}
