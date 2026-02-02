import { SetMetadata } from '@nestjs/common';
import { AuditActionType, AuditResourceType } from '../admin-audit.service';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
  action: AuditActionType;
  resourceType: AuditResourceType;
  resourceIdParam?: string; // Name of route param containing resource ID
  includeBody?: boolean; // Include request body in details
  includeQuery?: boolean; // Include query params in details
  details?: Record<string, any>; // Custom static details
}

/**
 * Decorator to automatically log admin actions.
 * 
 * Usage:
 * @AuditLog({
 *   action: AuditActionType.USER_UPDATED,
 *   resourceType: AuditResourceType.USER,
 *   resourceIdParam: 'id',
 *   includeBody: true,
 * })
 */
export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);
