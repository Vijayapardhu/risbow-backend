import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Current authenticated user from request.
 * Works with JwtAuthGuard attaching `req.user`.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});

