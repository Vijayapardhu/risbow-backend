import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderProcessingJob } from '../queues.service';
export declare class OrderProcessor extends WorkerHost {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    process(job: Job<OrderProcessingJob>): Promise<any>;
    private handleStockDeduction;
    private handleTimeline;
    private handleCoinDebit;
}
