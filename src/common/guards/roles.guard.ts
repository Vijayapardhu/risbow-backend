import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const { user } = request;

        // User is attached by JwtAuthGuard
        if (!user) {
            throw new ForbiddenException('Authentication required');
        }
        
        if (!user.role) {
            throw new ForbiddenException('User role not found');
        }

        const hasRequiredRole = requiredRoles.includes(user.role);
        if (!hasRequiredRole) {
            throw new ForbiddenException(
                `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.role}`
            );
        }

        return true;
    }
}
