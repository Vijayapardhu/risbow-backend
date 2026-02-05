import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole } from '@prisma/client';

/**
 * Audit action types for categorizing admin actions
 */
export enum AuditActionType {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  SESSION_REVOKED = 'SESSION_REVOKED',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_ACTIVATED = 'USER_ACTIVATED',

  // Vendor Management
  VENDOR_CREATED = 'VENDOR_CREATED',
  VENDOR_UPDATED = 'VENDOR_UPDATED',
  VENDOR_DELETED = 'VENDOR_DELETED',
  VENDOR_VERIFIED = 'VENDOR_VERIFIED',
  VENDOR_SUSPENDED = 'VENDOR_SUSPENDED',
  VENDOR_ACTIVATED = 'VENDOR_ACTIVATED',
  VENDOR_STRIKE_ISSUED = 'VENDOR_STRIKE_ISSUED',
  VENDOR_STRIKE_REVOKED = 'VENDOR_STRIKE_REVOKED',

  // Product Management
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  PRODUCT_APPROVED = 'PRODUCT_APPROVED',
  PRODUCT_REJECTED = 'PRODUCT_REJECTED',
  PRODUCT_BULK_UPDATE = 'PRODUCT_BULK_UPDATE',

  // Category Management
  CATEGORY_CREATED = 'CATEGORY_CREATED',
  CATEGORY_UPDATED = 'CATEGORY_UPDATED',
  CATEGORY_DELETED = 'CATEGORY_DELETED',

  // Order Management
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',

  // Payment Management
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',

  // Banner Management
  BANNER_CREATED = 'BANNER_CREATED',
  BANNER_UPDATED = 'BANNER_UPDATED',
  BANNER_DELETED = 'BANNER_DELETED',
  BANNER_APPROVED = 'BANNER_APPROVED',
  BANNER_REJECTED = 'BANNER_REJECTED',

  // Coin Management
  COIN_GRANTED = 'COIN_GRANTED',
  COIN_REVOKED = 'COIN_REVOKED',
  COIN_CONFIG_UPDATED = 'COIN_CONFIG_UPDATED',

  // Content Moderation
  CONTENT_FLAGGED = 'CONTENT_FLAGGED',
  CONTENT_APPROVED = 'CONTENT_APPROVED',
  CONTENT_REMOVED = 'CONTENT_REMOVED',

  // Admin Management
  ADMIN_CREATED = 'ADMIN_CREATED',
  ADMIN_UPDATED = 'ADMIN_UPDATED',
  ADMIN_DELETED = 'ADMIN_DELETED',
  ADMIN_ROLE_CHANGED = 'ADMIN_ROLE_CHANGED',

  // Platform Settings
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',

  // Invoice Management
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_VOIDED = 'INVOICE_VOIDED',

  // Reports
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_EXPORTED = 'REPORT_EXPORTED',

  // Bulk Operations
  BULK_IMPORT = 'BULK_IMPORT',
  BULK_EXPORT = 'BULK_EXPORT',
  BULK_DELETE = 'BULK_DELETE',
}

/**
 * Resource types for audit logging
 */
export enum AuditResourceType {
  USER = 'USER',
  VENDOR = 'VENDOR',
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  BANNER = 'BANNER',
  COIN = 'COIN',
  CONTENT = 'CONTENT',
  ADMIN = 'ADMIN',
  SETTINGS = 'SETTINGS',
  INVOICE = 'INVOICE',
  REPORT = 'REPORT',
  AUTH = 'AUTH',
}

interface AuditLogParams {
  adminId: string;
  adminEmail?: string;
  adminRole?: AdminRole;
  action: AuditActionType;
  resourceType: AuditResourceType;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

interface AuditSearchParams {
  adminId?: string;
  action?: AuditActionType;
  resourceType?: AuditResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an admin action
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      // Sanitize sensitive data from details
      const sanitizedDetails = this.sanitizeDetails(params.details);
      const sanitizedOldValues = this.sanitizeDetails(params.oldValues);
      const sanitizedNewValues = this.sanitizeDetails(params.newValues);

      await this.prisma.adminAction.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          details: {
            ...sanitizedDetails,
            adminEmail: params.adminEmail,
            adminRole: params.adminRole,
            oldValues: sanitizedOldValues,
            newValues: sanitizedNewValues,
          },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      // Log to console for debugging in non-production
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `[AUDIT] ${params.action} on ${params.resourceType}${params.resourceId ? `#${params.resourceId}` : ''} by ${params.adminEmail || params.adminId}`,
        );
      }
    } catch (error) {
      // Audit logging should never fail the main operation
      this.logger.error('Failed to create audit log', error);
    }
  }

  /**
   * Log authentication event
   */
  async logAuth(
    action: AuditActionType,
    adminId: string,
    adminEmail: string,
    ipAddress: string,
    userAgent?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      adminId,
      adminEmail,
      action,
      resourceType: AuditResourceType.AUTH,
      resourceId: adminId,
      ipAddress,
      userAgent,
      details,
    });
  }

  /**
   * Search audit logs with filters
   */
  async search(params: AuditSearchParams) {
    const {
      adminId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      ipAddress,
      page = 1,
      limit = 50,
    } = params;

    const where: any = {};

    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;
    if (ipAddress) where.ipAddress = ipAddress;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.adminAction.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adminAction.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceHistory(
    resourceType: AuditResourceType,
    resourceId: string,
    limit = 100,
  ) {
    return this.prisma.adminAction.findMany({
      where: {
        resourceType,
        resourceId,
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific admin
   */
  async getAdminActivity(adminId: string, page = 1, limit = 50) {
    return this.search({ adminId, page, limit });
  }

  /**
   * Get recent admin actions for dashboard
   */
  async getRecentActions(limit = 20) {
    return this.prisma.adminAction.findMany({
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get action statistics for a time period
   */
  async getActionStats(startDate: Date, endDate: Date) {
    const logs = await this.prisma.adminAction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        action: true,
        resourceType: true,
        createdAt: true,
      },
    });

    // Group by action type
    const byAction: Record<string, number> = {};
    const byResource: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    for (const log of logs) {
      // Count by action
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      // Count by resource
      byResource[log.resourceType] = (byResource[log.resourceType] || 0) + 1;

      // Count by date
      const dateKey = log.createdAt.toISOString().split('T')[0];
      byDate[dateKey] = (byDate[dateKey] || 0) + 1;
    }

    return {
      total: logs.length,
      byAction,
      byResource,
      byDate,
    };
  }

  /**
   * Export audit logs to JSON format
   */
  async exportLogs(params: AuditSearchParams): Promise<any[]> {
    // Use a larger limit for exports
    const result = await this.search({ ...params, limit: 10000 });
    return result.logs;
  }

  /**
   * Sanitize details to remove sensitive information
   */
  private sanitizeDetails(details?: Record<string, any>): Record<string, any> | undefined {
    if (!details) return undefined;

    const sensitiveKeys = [
      'password',
      'passwordHash',
      'secret',
      'mfaSecret',
      'token',
      'refreshToken',
      'accessToken',
      'backupCodes',
      'apiKey',
      'privateKey',
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(details)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
