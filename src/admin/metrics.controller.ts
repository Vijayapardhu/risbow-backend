import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CacheService } from '../shared/cache.service';
import { QueuesService } from '../queues/queues.service';
import { CacheMetrics } from '../shared/cache.service';

@ApiTags('Admin - Performance Metrics')
@Controller('admin/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MetricsController {
    constructor(
        private cache: CacheService,
        private queues: QueuesService
    ) { }

    @Get('cache')
    @Roles('ADMIN', 'SUPER_ADMIN')
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
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Get queue statistics' })
    async getQueueStats() {
        const stats = await this.queues.getQueueStats();

        return {
            timestamp: new Date().toISOString(),
            queues: stats,
        };
    }
}
