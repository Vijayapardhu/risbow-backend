import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { CacheService } from '../shared/cache.service';
import { QueuesService } from '../queues/queues.service';
import { CacheMetrics } from '../shared/cache.service';

@ApiTags('Admin - Performance Metrics')
@Controller('admin/metrics')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@ApiBearerAuth()
export class MetricsController {
    constructor(
        private cache: CacheService,
        private queues: QueuesService
    ) { }

    @Get('cache')
    @AdminRoles(AdminRole.OPERATIONS_ADMIN)
    @ApiOperation({ summary: 'Get cache hit/miss metrics' })
    async getCacheMetrics() {
        const metrics: Record<string, CacheMetrics> = this.cache.getMetrics();

        return {
            timestamp: new Date().toISOString(),
            metrics,
            summary: {
                totalHits: Object.values(metrics).reduce((sum, m) => sum + m.hits, 0),
                totalMisses: Object.values(metrics).reduce((sum, m) => sum + m.misses, 0),
                averageHitRatio: Object.values(metrics).length > 0
                    ? Object.values(metrics).reduce((sum, m) => sum + m.ratio, 0) / Object.values(metrics).length
                    : 0,
            }
        };
    }

    @Get('queues')
    @AdminRoles(AdminRole.OPERATIONS_ADMIN)
    @ApiOperation({ summary: 'Get queue statistics' })
    async getQueueStats() {
        const stats = await this.queues.getQueueStats();

        return {
            timestamp: new Date().toISOString(),
            queues: stats,
        };
    }
}
