import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationJob } from '../queues.service';

@Processor('notifications', {
    concurrency: 10,
    limiter: {
        max: 100,
        duration: 60000, // 100 notifications per minute
    },
})
export class NotificationProcessor extends WorkerHost {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(private prisma: PrismaService) {
        super();
    }

    async process(job: Job<NotificationJob>): Promise<any> {
        this.logger.debug(`Processing notification job: ${job.id}`);

        try {
            const { type, userId, title, body, targetAudience } = job.data;

            if (type === 'push') {
                await this.sendPushNotification(userId, title, body, targetAudience);
            } else if (type === 'email') {
                await this.sendEmailNotification(userId, title, body);
            }

            return { success: true, type, userId };
        } catch (error) {
            this.logger.error(`Notification job failed: ${error.message}`, error.stack);
            throw error; // Will trigger retry
        }
    }

    private async sendPushNotification(
        userId: string | undefined,
        title: string,
        body: string,
        targetAudience?: string
    ) {
        // Create notification in database
        if (userId) {
            await this.prisma.notification.create({
                data: {
                    userId,
                    title,
                    body,
                    type: 'PUSH',
                },
            });
            this.logger.log(`Push notification sent to user ${userId}`);
        } else if (targetAudience) {
            // Broadcast notification
            this.logger.log(`Broadcast push notification to ${targetAudience}`);
            // In production, you would send to FCM/APNS here
        }
    }

    private async sendEmailNotification(userId: string | undefined, title: string, body: string) {
        if (!userId) {
            this.logger.warn('Email notification requires userId');
            return;
        }

        // Get user email
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });

        if (!user?.email) {
            this.logger.warn(`User ${userId} has no email address`);
            return;
        }

        // In production, you would send email via SMTP here
        this.logger.log(`Email sent to ${user.email}: ${title}`);
    }
}
