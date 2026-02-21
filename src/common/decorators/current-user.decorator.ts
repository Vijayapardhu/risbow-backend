import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Current authenticated user from request.
 * Works with JwtAuthGuard attaching `req.user`.
 * 
 * Usage:
 * - @CurrentUser() user - returns full user object
 * - @CurrentUser('id') userId - returns just the id
 */
export const CurrentUser = createParamDecorator((data: string | unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const user = req.user;
  
  if (!user) {
    return null;
  }
  
  // If data is provided (e.g., 'id'), return that specific property
  if (data && typeof data === 'string') {
    return user[data];
  }
  
  // Otherwise return the full user object
  return user;
});

