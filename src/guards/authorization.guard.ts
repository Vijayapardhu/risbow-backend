import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const { user, params } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Check if user has required permissions
    const hasPermission = await this.checkUserPermissions(user.id, requiredPermissions);

    if (!hasPermission) {
      return false;
    }

    // For IDOR prevention, check if user can access the specific resource
    const resourceId = params.id;
    if (resourceId) {
      const canAccessResource = await this.checkResourceAccess(user, context.getClass().name, resourceId);
      if (!canAccessResource) {
        return false;
      }
    }

    return true;
  }

  private async checkUserPermissions(userId: string, requiredPermissions: string[]): Promise<boolean> {
    // In a real implementation, you'd check the user's permissions in the database
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // Check if user has all required permissions
    return requiredPermissions.every(permission =>
      (user as any).permissions.includes(permission)
    );
  }

  private async checkResourceAccess(user: any, resourceType: string, resourceId: string): Promise<boolean> {
    // Implement resource-level access control based on user role and resource ownership
    switch (resourceType) {
      case 'User':
        // Admins can access any user, regular users can only access their own data
        if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
          return true;
        }
        return user.id === resourceId;

      case 'Order':
        // Vendors can only access their own orders, admins can access all
        if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
          return true;
        }
        if (user.role === 'VENDOR') {
          const vendorOrder = await this.prisma.vendorOrder.findFirst({
            where: { orderId: resourceId, vendorId: user.id },
          });
          return !!vendorOrder;
        }
        return user.id === resourceId; // Regular user accessing their own order

      default:
        // Default to admin access only
        return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    }
  }
}