import { Injectable } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

/**
 * All available permissions in the admin system.
 * Permissions follow the pattern: RESOURCE_ACTION
 */
export enum Permission {
  // Dashboard
  DASHBOARD_VIEW = 'dashboard:view',
  DASHBOARD_ANALYTICS = 'dashboard:analytics',

  // User Management
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_SUSPEND = 'user:suspend',
  USER_EXPORT = 'user:export',

  // Vendor Management
  VENDOR_READ = 'vendor:read',
  VENDOR_CREATE = 'vendor:create',
  VENDOR_UPDATE = 'vendor:update',
  VENDOR_DELETE = 'vendor:delete',
  VENDOR_VERIFY = 'vendor:verify',
  VENDOR_SUSPEND = 'vendor:suspend',
  VENDOR_STRIKE = 'vendor:strike',
  VENDOR_EXPORT = 'vendor:export',

  // Product Management
  PRODUCT_READ = 'product:read',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',
  PRODUCT_APPROVE = 'product:approve',
  PRODUCT_BULK_UPDATE = 'product:bulk_update',
  PRODUCT_EXPORT = 'product:export',

  // Category Management
  CATEGORY_READ = 'category:read',
  CATEGORY_CREATE = 'category:create',
  CATEGORY_UPDATE = 'category:update',
  CATEGORY_DELETE = 'category:delete',

  // Order Management
  ORDER_READ = 'order:read',
  ORDER_UPDATE = 'order:update',
  ORDER_CANCEL = 'order:cancel',
  ORDER_EXPORT = 'order:export',

  // Payment Management
  PAYMENT_READ = 'payment:read',
  PAYMENT_PROCESS = 'payment:process',
  PAYMENT_EXPORT = 'payment:export',

  // Banner & Campaign Management
  BANNER_READ = 'banner:read',
  BANNER_CREATE = 'banner:create',
  BANNER_UPDATE = 'banner:update',
  BANNER_DELETE = 'banner:delete',
  BANNER_APPROVE = 'banner:approve',

  // Coin Management
  COIN_READ = 'coin:read',
  COIN_GRANT = 'coin:grant',
  COIN_REVOKE = 'coin:revoke',
  COIN_CONFIG = 'coin:config',
  COIN_EXPORT = 'coin:export',

  // Content Moderation
  CONTENT_READ = 'content:read',
  CONTENT_MODERATE = 'content:moderate',
  CONTENT_DELETE = 'content:delete',

  // CMS Management
  CMS_READ = 'cms:read',
  CMS_CREATE = 'cms:create',
  CMS_UPDATE = 'cms:update',
  CMS_DELETE = 'cms:delete',

  // Reports & Analytics
  REPORT_VIEW = 'report:view',
  REPORT_CREATE = 'report:create',
  REPORT_EXPORT = 'report:export',

  // Platform Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',

  // Admin Management
  ADMIN_READ = 'admin:read',
  ADMIN_CREATE = 'admin:create',
  ADMIN_UPDATE = 'admin:update',
  ADMIN_DELETE = 'admin:delete',

  // Audit Logs
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',

  // Invoices
  INVOICE_READ = 'invoice:read',
  INVOICE_CREATE = 'invoice:create',
  INVOICE_VOID = 'invoice:void',
  INVOICE_EXPORT = 'invoice:export',

  // Support Tickets
  TICKET_READ = 'ticket:read',
  TICKET_CREATE = 'ticket:create',
  TICKET_UPDATE = 'ticket:update',
  TICKET_DELETE = 'ticket:delete',
  TICKET_ASSIGN = 'ticket:assign',
  TICKET_RESOLVE = 'ticket:resolve',
  TICKET_MESSAGE_ADD = 'ticket:message_add',
  TICKET_MESSAGE_READ = 'ticket:message_read',
}

/**
 * Permission groups for easier role assignment
 */
export const PermissionGroups = {
  VIEWER: [
    Permission.DASHBOARD_VIEW,
    Permission.USER_READ,
    Permission.VENDOR_READ,
    Permission.PRODUCT_READ,
    Permission.CATEGORY_READ,
    Permission.ORDER_READ,
    Permission.PAYMENT_READ,
    Permission.BANNER_READ,
    Permission.COIN_READ,
    Permission.CONTENT_READ,
    Permission.REPORT_VIEW,
    Permission.SETTINGS_READ,
    Permission.AUDIT_READ,
    Permission.INVOICE_READ,
  ],

  USER_MANAGER: [
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_SUSPEND,
    Permission.USER_EXPORT,
  ],

  VENDOR_MANAGER: [
    Permission.VENDOR_READ,
    Permission.VENDOR_CREATE,
    Permission.VENDOR_UPDATE,
    Permission.VENDOR_VERIFY,
    Permission.VENDOR_SUSPEND,
    Permission.VENDOR_STRIKE,
    Permission.VENDOR_EXPORT,
  ],

  PRODUCT_MANAGER: [
    Permission.PRODUCT_READ,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.PRODUCT_APPROVE,
    Permission.PRODUCT_BULK_UPDATE,
    Permission.PRODUCT_EXPORT,
  ],

  ORDER_MANAGER: [
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_CANCEL,
    Permission.ORDER_EXPORT,
  ],

  MODERATOR: [
    Permission.CONTENT_READ,
    Permission.CONTENT_MODERATE,
    Permission.CONTENT_DELETE,
    Permission.VENDOR_STRIKE,
  ],

  FINANCE: [
    Permission.PAYMENT_READ,
    Permission.PAYMENT_PROCESS,
    Permission.PAYMENT_EXPORT,
    Permission.COIN_READ,
    Permission.COIN_GRANT,
    Permission.COIN_REVOKE,
    Permission.COIN_EXPORT,
    Permission.INVOICE_READ,
    Permission.INVOICE_CREATE,
    Permission.INVOICE_EXPORT,
  ],

  MARKETING: [
    Permission.BANNER_READ,
    Permission.BANNER_CREATE,
    Permission.BANNER_UPDATE,
    Permission.BANNER_DELETE,
    Permission.REPORT_VIEW,
    Permission.REPORT_VIEW,
  ],

  SUPPORT: [
    Permission.TICKET_READ,
    Permission.TICKET_CREATE,
    Permission.TICKET_UPDATE,
    Permission.TICKET_DELETE,
    Permission.TICKET_ASSIGN,
    Permission.TICKET_RESOLVE,
    Permission.TICKET_MESSAGE_ADD,
    Permission.TICKET_MESSAGE_READ,
  ],

  FULL_ACCESS: Object.values(Permission),
};

/**
 * Role to Permissions mapping
 */
const RolePermissions: Record<AdminRole, Permission[]> = {
  [AdminRole.SUPER_ADMIN]: Object.values(Permission), // All permissions

  // OPERATIONS_ADMIN has full operational permissions (similar to old ADMIN role)
  [AdminRole.OPERATIONS_ADMIN]: [
    ...PermissionGroups.VIEWER,
    ...PermissionGroups.USER_MANAGER,
    ...PermissionGroups.VENDOR_MANAGER,
    ...PermissionGroups.PRODUCT_MANAGER,
    ...PermissionGroups.ORDER_MANAGER,
    ...PermissionGroups.MODERATOR,
    Permission.CATEGORY_CREATE,
    Permission.CATEGORY_UPDATE,
    Permission.CATEGORY_DELETE,
    Permission.BANNER_CREATE,
    Permission.BANNER_UPDATE,
    Permission.BANNER_DELETE,
    Permission.BANNER_APPROVE,
    Permission.ADMIN_READ,
    Permission.AUDIT_EXPORT,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
    ...PermissionGroups.SUPPORT,
  ],

  // CONTENT_MODERATOR has moderation permissions (similar to old MODERATOR role)
  [AdminRole.CONTENT_MODERATOR]: [
    ...PermissionGroups.VIEWER,
    ...PermissionGroups.MODERATOR,
    Permission.USER_UPDATE,
    Permission.VENDOR_UPDATE,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.PRODUCT_APPROVE,
  ],

  // FINANCE_ADMIN has financial and support permissions (similar to old SUPPORT role)
  [AdminRole.FINANCE_ADMIN]: [
    ...PermissionGroups.VIEWER,
    Permission.USER_UPDATE,
    Permission.ORDER_UPDATE,
    Permission.ORDER_CANCEL,
    Permission.COIN_GRANT, // Limited amounts
    Permission.PAYMENT_READ,
    Permission.PAYMENT_EXPORT,
    Permission.INVOICE_READ,
    Permission.INVOICE_EXPORT,
  ],

  // ANALYTICS_VIEWER has read and export permissions (similar to old ANALYST role)
  [AdminRole.ANALYTICS_VIEWER]: [
    ...PermissionGroups.VIEWER,
    Permission.DASHBOARD_ANALYTICS,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
    Permission.USER_EXPORT,
    Permission.VENDOR_EXPORT,
    Permission.PRODUCT_EXPORT,
    Permission.ORDER_EXPORT,
    Permission.PAYMENT_EXPORT,
    Permission.COIN_EXPORT,
    Permission.AUDIT_EXPORT,
    Permission.INVOICE_EXPORT,
  ],
};

@Injectable()
export class AdminPermissionsService {
  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(role: AdminRole): Permission[] {
    return RolePermissions[role] || [];
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: AdminRole, permission: Permission): boolean {
    const permissions = this.getPermissionsForRole(role);
    return permissions.includes(permission);
  }

  /**
   * Check if a role has all of the specified permissions
   */
  hasAllPermissions(role: AdminRole, requiredPermissions: Permission[]): boolean {
    const permissions = this.getPermissionsForRole(role);
    return requiredPermissions.every((p) => permissions.includes(p));
  }

  /**
   * Check if a role has any of the specified permissions
   */
  hasAnyPermission(role: AdminRole, requiredPermissions: Permission[]): boolean {
    const permissions = this.getPermissionsForRole(role);
    return requiredPermissions.some((p) => permissions.includes(p));
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Get permissions grouped by resource
   */
  getPermissionsByResource(): Record<string, Permission[]> {
    const grouped: Record<string, Permission[]> = {};

    for (const permission of Object.values(Permission)) {
      const [resource] = permission.split(':');
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(permission);
    }

    return grouped;
  }

  /**
   * Get role hierarchy (higher index = more permissions)
   */
  getRoleHierarchy(): AdminRole[] {
    return [
      AdminRole.ANALYTICS_VIEWER,
      AdminRole.FINANCE_ADMIN,
      AdminRole.CONTENT_MODERATOR,
      AdminRole.OPERATIONS_ADMIN,
      AdminRole.SUPER_ADMIN,
    ];
  }

  /**
   * Check if a role is higher than another
   */
  isRoleHigherThan(role: AdminRole, otherRole: AdminRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy.indexOf(role) > hierarchy.indexOf(otherRole);
  }

  /**
   * Check if a role can manage another role
   */
  canManageRole(managerRole: AdminRole, targetRole: AdminRole): boolean {
    // SUPER_ADMIN can manage all roles
    if (managerRole === AdminRole.SUPER_ADMIN) {
      return true;
    }

    // ADMIN can manage all except SUPER_ADMIN and other ADMINs
    if (managerRole === AdminRole.OPERATIONS_ADMIN) {
      return targetRole !== AdminRole.SUPER_ADMIN && targetRole !== AdminRole.OPERATIONS_ADMIN;
    }

    // Other roles cannot manage roles
    return false;
  }
}

