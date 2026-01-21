import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { BannerAnalyticsJob } from '../queues.service';
export declare class AnalyticsProcessor extends WorkerHost {
    private prisma;
    private readonly logger;
    private batchBuffer;
    private batchTimer;
    constructor(prisma: PrismaService);
    process(job: Job<BannerAnalyticsJob>): Promise<any>;
    private flushBatch;
}
