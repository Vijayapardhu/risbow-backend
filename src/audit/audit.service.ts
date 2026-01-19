import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
    constructor(private prisma: PrismaService) { }

    async logAdminAction(
        adminId: string,
        action: string,
        entity: string,
        entityId: string,
        details?: any,
        ipAddress?: string,
        userAgent?: string,
    ) {
        if (!adminId) {
            console.warn('AuditLogService: adminId is missing, skipping log.');
            return;
        }

        return this.prisma.auditLog.create({
            data: {
                adminId,
                action,
                entity,
                entityId,
                details: details || {},
                ipAddress,
                userAgent,
            },
        });
    }

    async getLogs(params: {
        page?: number;
        limit?: number;
        adminId?: string;
        action?: string;
        entity?: string;
    }) {
        const { page = 1, limit = 20, adminId, action, entity } = params;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (adminId) where.adminId = adminId;
        if (action) where.action = action;
        if (entity) where.entity = entity;

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    admin: {
                        select: { name: true, email: true }
                    }
                }
            }),
            this.prisma.auditLog.count({ where })
        ]);

        return {
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
