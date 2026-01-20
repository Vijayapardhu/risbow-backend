"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AuditLogService = class AuditLogService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logAdminAction(adminId, action, entity, entityId, details, ipAddress, userAgent) {
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
    async getLogs(params) {
        const { page = 1, limit = 20, adminId, action, entity } = params;
        const skip = (page - 1) * limit;
        const where = {};
        if (adminId)
            where.adminId = adminId;
        if (action)
            where.action = action;
        if (entity)
            where.entity = entity;
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
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditLogService);
//# sourceMappingURL=audit.service.js.map