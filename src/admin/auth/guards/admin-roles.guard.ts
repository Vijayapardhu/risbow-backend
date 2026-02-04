import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';
import { AdminRole } from '../types';

/**
 * Guard that checks if the current admin has one of the required roles.
 * 
 * Usage:
 * @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
 * @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
 */
@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access (authenticated users only)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    // SUPER_ADMIN always has access
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user has one of the required roles
    return requiredRoles.includes(user.role as AdminRole);
  }
}
