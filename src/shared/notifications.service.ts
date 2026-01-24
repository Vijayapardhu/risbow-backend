import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private prisma: PrismaService,
        private queues: QueuesService,
    ) { }

    async createNotification(userId: string, title: string, body: string, type: string, targetAudience: string = 'INDIVIDUAL') {
        try {
            const notification = await this.prisma.notification.create({
                data: {
                    userId,
                    title,
                    body,
                    type,
                    targetAudience,
                    isRead: false
                }
            });
            this.logger.log(`[DB NOTIFICATION] Created for User ${userId}: ${title}`);

            // Queue delivery (push/email handled by NotificationProcessor)
            await this.queues.addNotification({
                type: 'push',
                userId,
                title,
                body,
                targetAudience,
            });

            return notification;
        } catch (error) {
            this.logger.error(`Failed to create notification for user ${userId}`, error.stack);
        }
    }

    async sendPush(userId: string, title: string, body: string) {
        await this.queues.addNotification({ type: 'push', userId, title, body });
        return { queued: true };
    }

    async sendSMS(mobile: string, message: string) {
        // SMS delivery is not yet wired into NotificationProcessor job types; keep as safe, explicit no-op.
        // This avoids silently claiming delivery without a configured provider.
        this.logger.warn(`[SMS NOT CONFIGURED] ${mobile}: ${message}`);
        return { queued: false };
    }

    async sendEmail(email: string, subject: string, content: string) {
        // Email queue expects a userId; if caller only has email, we keep best-effort log.
        this.logger.warn(`[EMAIL QUEUE REQUIRES USERID] ${email}: ${subject}`);
        return { queued: false };
    }
}
