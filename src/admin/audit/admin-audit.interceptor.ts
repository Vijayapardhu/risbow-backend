import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AdminAuditService, AuditActionType, AuditResourceType } from './admin-audit.service';
import { AUDIT_LOG_KEY, AuditLogOptions } from './decorators/audit-log.decorator';

/**
 * Interceptor that automatically logs admin actions based on @AuditLog decorator
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AdminAuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditLogOptions>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // If no @AuditLog decorator, skip logging
    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no authenticated user, skip logging
    if (!user) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (response) => {
          // Extract resource ID from params, body, or response
          let resourceId = auditOptions.resourceIdParam
            ? request.params[auditOptions.resourceIdParam]
            : undefined;

          if (!resourceId && response?.id) {
            resourceId = response.id;
          }

          // Build details
          const details: Record<string, any> = {
            duration: Date.now() - startTime,
            method: request.method,
            path: request.path,
          };

          // Include body parameters if specified
          if (auditOptions.includeBody && request.body) {
            details.body = request.body;
          }

          // Include query parameters if specified
          if (auditOptions.includeQuery && request.query) {
            details.query = request.query;
          }

          // Include custom details
          if (auditOptions.details) {
            Object.assign(details, auditOptions.details);
          }

          await this.auditService.log({
            adminId: user.id,
            adminEmail: user.email,
            adminRole: user.role,
            action: auditOptions.action,
            resourceType: auditOptions.resourceType,
            resourceId,
            details,
            ipAddress: request.ip || request.connection?.remoteAddress,
            userAgent: request.get('user-agent'),
          });
        },
        error: async (error) => {
          // Log failed actions too (with error info)
          const details: Record<string, any> = {
            duration: Date.now() - startTime,
            method: request.method,
            path: request.path,
            error: {
              message: error.message,
              status: error.status,
            },
          };

          await this.auditService.log({
            adminId: user.id,
            adminEmail: user.email,
            adminRole: user.role,
            action: auditOptions.action,
            resourceType: auditOptions.resourceType,
            details: {
              ...details,
              failed: true,
            },
            ipAddress: request.ip || request.connection?.remoteAddress,
            userAgent: request.get('user-agent'),
          });
        },
      }),
    );
  }
}
