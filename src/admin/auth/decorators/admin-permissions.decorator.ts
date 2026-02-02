import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../rbac/admin-permissions.service';

export const ADMIN_PERMISSIONS_KEY = 'admin_permissions';

/**
 * Decorator to specify which permissions are required to access a route.
 * SUPER_ADMIN always has all permissions.
 * 
 * Usage:
 * @RequirePermissions(Permission.USER_READ, Permission.USER_WRITE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
