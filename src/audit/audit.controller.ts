import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AuditController {
    constructor(private readonly auditService: AuditLogService) { }

    @Get()
    async getLogs(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('adminId') adminId: string,
        @Query('action') action: string,
        @Query('entity') entity: string
    ) {
        return this.auditService.getLogs({
            page: Number(page) || 1,
            limit: Number(limit) || 20,
            adminId,
            action,
            entity
        });
    }
}
