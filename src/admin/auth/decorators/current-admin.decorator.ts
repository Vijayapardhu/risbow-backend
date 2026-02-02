import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminRequestUser } from '../strategies/admin-jwt.strategy';

/**
 * Decorator to extract the current admin user from the request.
 * 
 * Usage:
 * @CurrentAdmin() admin: AdminRequestUser
 * @CurrentAdmin('id') adminId: string
 * @CurrentAdmin('role') role: AdminRole
 */
export const CurrentAdmin = createParamDecorator(
  (data: keyof AdminRequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AdminRequestUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
