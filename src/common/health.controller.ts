
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private prisma: PrismaService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    async check() {
        try {
            // Simple DB check
            await this.prisma.$queryRaw`SELECT 1`;
            return { status: 'ok', timestamp: new Date().toISOString() };
        } catch (e) {
            return { status: 'error', message: 'Database unreachable' };
        }
    }
}

// Root-level health endpoint for Azure App Service health checks
// Azure expects /health (not /api/v1/health) for health probes
@Controller()
export class RootHealthController {
    constructor(private prisma: PrismaService) { }

    @Get('health')
    @HttpCode(HttpStatus.OK)
    async rootCheck() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return { status: 'ok', timestamp: new Date().toISOString() };
        } catch (e) {
            return { status: 'error', message: 'Database unreachable' };
        }
    }
}
