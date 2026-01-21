import { AuditLogService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditLogService);
    getLogs(page: string, limit: string, adminId: string, action: string, entity: string): Promise<{
        data: ({
            admin: {
                name: string;
                email: string;
            };
        } & {
            id: string;
            entity: string;
            action: string;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            entityId: string;
            ipAddress: string | null;
            userAgent: string | null;
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
