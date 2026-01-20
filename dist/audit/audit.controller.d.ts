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
