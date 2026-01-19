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
}
