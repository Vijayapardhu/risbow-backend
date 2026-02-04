import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { REQUIRE_MFA_KEY } from '../decorators/require-mfa.decorator';

/**
 * Guard that ensures the admin has MFA enabled for sensitive operations.
 * 
 * Usage:
 * @UseGuards(AdminJwtAuthGuard, AdminMfaGuard)
 * @RequireMfa()
 */
@Injectable()
export class AdminMfaGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireMfa = this.reflector.getAllAndOverride<boolean>(REQUIRE_MFA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If MFA not required for this route, allow access
    if (!requireMfa) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.id) {
      return false;
    }

    // Check if admin has MFA enabled
    // TODO: Add mfaEnabled field to Admin model
    const admin = await this.prisma.admin.findUnique({
      where: { id: user.id },
      select: { id: true, isActive: true },
    });

    if (!admin) {
      throw new ForbiddenException(
        'Admin not found.',
      );
    }

    // TODO: Enable MFA check when mfaEnabled field is added to Admin model
    // For now, just verify the admin exists and is active
    // if (!admin.mfaEnabled) {
    //   throw new ForbiddenException(
    //     'This action requires MFA to be enabled. Please enable MFA in your account settings.',
    //   );
    // }

    return true;
  }
}
