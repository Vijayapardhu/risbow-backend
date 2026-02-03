import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = context.switchToHttp().getRequest();

        // User is attached by JwtAuthGuard
        if (!user || !user.role) return false;

        // SECURITY FIX: Allow both ADMIN and SUPER_ADMIN roles
        return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    }
}