import { PrismaService } from '../prisma/prisma.service';
export declare class AuditLogService {
    private prisma;
    constructor(prisma: PrismaService);
    logAdminAction(adminId: string, action: string, entity: string, entityId: string, details?: any, ipAddress?: string, userAgent?: string): Promise<{
        id: string;
        action: string;
        entity: string;
        entityId: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
        adminId: string;
    }>;
    getLogs(params: {
        page?: number;
        limit?: number;
        adminId?: string;
        action?: string;
        entity?: string;
    }): Promise<{
        data: ({
            admin: {
                name: string;
                email: string;
            };
        } & {
            id: string;
            action: string;
            entity: string;
            entityId: string;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            userAgent: string | null;
            createdAt: Date;
            adminId: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
