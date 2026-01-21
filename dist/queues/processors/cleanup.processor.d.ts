import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CleanupJob } from '../queues.service';
export declare class CleanupProcessor extends WorkerHost {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    process(job: Job<CleanupJob>): Promise<any>;
    private cleanupExpiredBanners;
    private cleanupExpiredCoupons;
    private cleanupAbandonedCheckouts;
}
