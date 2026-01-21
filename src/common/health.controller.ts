
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private prisma: PrismaService) { }

    @Get()
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
