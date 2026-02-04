import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../types';

export const ADMIN_ROLES_KEY = 'admin_roles';

/**
 * Decorator to specify which admin roles can access a route.
 * SUPER_ADMIN always has access regardless of this decorator.
 * 
 * Usage:
 * @AdminRoles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
 */
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
