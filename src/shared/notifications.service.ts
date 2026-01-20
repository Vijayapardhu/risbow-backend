import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private prisma: PrismaService) { }

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

            // Optionally trigger real-time push here via socket or push service
            await this.sendPush(userId, title, body);

            return notification;
        } catch (error) {
            this.logger.error(`Failed to create notification for user ${userId}`, error.stack);
        }
    }

    async sendPush(userId: string, title: string, body: string) {
        // Stub: In real app, use Firebase/OneSignal
        this.logger.log(`[PUSH -> ${userId}] ${title}: ${body}`);
        return true;
    }

    async sendSMS(mobile: string, message: string) {
        // Stub: In real app, use Twilio/Msg91
        this.logger.log(`[SMS -> ${mobile}] ${message}`);
        return true;
    }

    async sendEmail(email: string, subject: string, content: string) {
        // Stub: In real app, use SendGrid/AWS SES
        this.logger.log(`[EMAIL -> ${email}] ${subject}`);
        return true;
    }
}
