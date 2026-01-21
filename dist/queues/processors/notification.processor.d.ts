import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationJob } from '../queues.service';
export declare class NotificationProcessor extends WorkerHost {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    process(job: Job<NotificationJob>): Promise<any>;
    private sendPushNotification;
    private sendEmailNotification;
}
