import { Test, TestingModule } from '@nestjs/testing';
import { AdminPermissionsService, Permission } from '../src/admin/rbac/admin-permissions.service';

describe('AdminPermissionsService', () => {
  let service: AdminPermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminPermissionsService],
    }).compile();

    service = module.get<AdminPermissionsService>(AdminPermissionsService);
  });

  describe('getPermissionsForRole', () => {
    it('should return all permissions for SUPER_ADMIN', () => {
      const permissions = service.getPermissionsForRole('SUPER_ADMIN');

      // SUPER_ADMIN should have all permissions
      expect(permissions).toContain(Permission.ADMIN_CREATE);
      expect(permissions).toContain(Permission.ADMIN_DELETE);
      expect(permissions).toContain(Permission.USER_DELETE);
      expect(permissions).toContain(Permission.SYSTEM_SETTINGS);
    });

    it('should return limited permissions for ADMIN', () => {
      const permissions = service.getPermissionsForRole('ADMIN');

      // ADMIN should have most permissions but not SUPER_ADMIN only
      expect(permissions).not.toContain(Permission.ADMIN_CREATE);
      expect(permissions).not.toContain(Permission.ADMIN_DELETE);
      expect(permissions).toContain(Permission.USER_READ);
      expect(permissions).toContain(Permission.VENDOR_UPDATE);
    });

    it('should return moderation permissions for MODERATOR', () => {
      const permissions = service.getPermissionsForRole('MODERATOR');

      expect(permissions).toContain(Permission.MODERATION_QUEUE);
      expect(permissions).toContain(Permission.MODERATION_APPROVE);
      expect(permissions).toContain(Permission.MODERATION_REJECT);
      expect(permissions).toContain(Permission.PRODUCT_READ);
    });

    it('should return support permissions for SUPPORT', () => {
      const permissions = service.getPermissionsForRole('SUPPORT');

      expect(permissions).toContain(Permission.USER_READ);
      expect(permissions).toContain(Permission.ORDER_READ);
      expect(permissions).not.toContain(Permission.USER_DELETE);
      expect(permissions).not.toContain(Permission.VENDOR_DELETE);
    });

    it('should return analytics permissions for ANALYST', () => {
      const permissions = service.getPermissionsForRole('ANALYST');

      expect(permissions).toContain(Permission.DASHBOARD_VIEW);
      expect(permissions).toContain(Permission.DASHBOARD_ANALYTICS);
      expect(permissions).toContain(Permission.REPORT_VIEW);
      expect(permissions).toContain(Permission.REPORT_CREATE);
    });

    it('should return empty array for unknown role', () => {
      const permissions = service.getPermissionsForRole('UNKNOWN');
      expect(permissions).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true when admin has permission', () => {
      expect(service.hasPermission('SUPER_ADMIN', Permission.ADMIN_CREATE)).toBe(true);
      expect(service.hasPermission('ADMIN', Permission.USER_READ)).toBe(true);
      expect(service.hasPermission('MODERATOR', Permission.MODERATION_QUEUE)).toBe(true);
    });

    it('should return false when admin lacks permission', () => {
      expect(service.hasPermission('ANALYST', Permission.USER_DELETE)).toBe(false);
      expect(service.hasPermission('SUPPORT', Permission.VENDOR_DELETE)).toBe(false);
      expect(service.hasPermission('MODERATOR', Permission.ADMIN_CREATE)).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when admin has all permissions', () => {
      expect(
        service.hasAllPermissions('SUPER_ADMIN', [
          Permission.ADMIN_CREATE,
          Permission.USER_DELETE,
        ]),
      ).toBe(true);
    });

    it('should return false when admin lacks any permission', () => {
      expect(
        service.hasAllPermissions('ADMIN', [
          Permission.USER_READ,
          Permission.ADMIN_CREATE, // ADMIN doesn't have this
        ]),
      ).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when admin has at least one permission', () => {
      expect(
        service.hasAnyPermission('ANALYST', [
          Permission.ADMIN_CREATE, // Doesn't have
          Permission.DASHBOARD_VIEW, // Has this
        ]),
      ).toBe(true);
    });

    it('should return false when admin has none of the permissions', () => {
      expect(
        service.hasAnyPermission('ANALYST', [
          Permission.ADMIN_CREATE,
          Permission.USER_DELETE,
        ]),
      ).toBe(false);
    });
  });

  describe('getRoleHierarchy', () => {
    it('should return correct hierarchy level', () => {
      expect(service.getRoleHierarchy('SUPER_ADMIN')).toBe(5);
      expect(service.getRoleHierarchy('ADMIN')).toBe(4);
      expect(service.getRoleHierarchy('MODERATOR')).toBe(3);
      expect(service.getRoleHierarchy('SUPPORT')).toBe(2);
      expect(service.getRoleHierarchy('ANALYST')).toBe(1);
    });
  });

  describe('canManageRole', () => {
    it('should allow higher roles to manage lower roles', () => {
      expect(service.canManageRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
      expect(service.canManageRole('ADMIN', 'MODERATOR')).toBe(true);
    });

    it('should not allow managing equal or higher roles', () => {
      expect(service.canManageRole('ADMIN', 'ADMIN')).toBe(false);
      expect(service.canManageRole('MODERATOR', 'ADMIN')).toBe(false);
    });
  });
});
