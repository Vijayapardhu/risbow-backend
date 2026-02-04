import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_PERMISSIONS_KEY } from '../decorators/admin-permissions.decorator';
import { AdminPermissionsService, Permission } from '../../rbac/admin-permissions.service';
import { AdminRole } from '../types';

/**
 * Guard that checks if the current admin has the required permissions.
 * 
 * Usage:
 * @UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
 * @RequirePermissions(Permission.USER_READ, Permission.USER_WRITE)
 */
@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: AdminPermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are specified, allow access (authenticated users only)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    // SUPER_ADMIN always has all permissions
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      this.permissionsService.hasPermission(user.role as AdminRole, permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
