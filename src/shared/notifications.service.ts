import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';
import { randomUUID } from 'crypto';

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
                    id: randomUUID(),
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

    async sendSMS(mobile: string, message: string, userId?: string) {
        // Queue SMS notification
        await this.queues.addNotification({
            type: 'sms',
            userId,
            mobile,
            title: 'RISBOW',
            body: message,
        });
        return { queued: true };
    }

    async sendEmail(email: string, subject: string, content: string, userId?: string) {
        // If userId not provided, try to find by email
        if (!userId && email) {
            const user = await this.prisma.user.findUnique({
                where: { email },
                select: { id: true },
            });
            userId = user?.id;
        }

        if (!userId) {
            this.logger.warn(`[EMAIL SKIPPED] No userId found for email: ${email}`);
            return { queued: false };
        }

        // Queue email notification
        await this.queues.addNotification({
            type: 'email',
            userId,
            title: subject,
            body: content,
        });
        return { queued: true };
    }

    async sendWhatsApp(mobile: string, message: string, userId?: string) {
        // Queue WhatsApp notification
        await this.queues.addNotification({
            type: 'whatsapp',
            userId,
            mobile,
            title: 'RISBOW',
            body: message,
        });
        return { queued: true };
    }
}
