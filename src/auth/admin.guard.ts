import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = context.switchToHttp().getRequest();

        // User is attached by JwtAuthGuard
        if (!user || !user.role) return false;

        return user.role === UserRole.ADMIN;
    }
}