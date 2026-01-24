import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationJob } from '../queues.service';
import axios from 'axios';
import { CommunicationService } from '../../shared/communication.service';

@Processor('notifications', {
    concurrency: 10,
    limiter: {
        max: 100,
        duration: 60000, // 100 notifications per minute
    },
})
export class NotificationProcessor extends WorkerHost {
    private readonly logger = new Logger(NotificationProcessor.name);

    constructor(
        private prisma: PrismaService,
        private communication: CommunicationService,
    ) {
        super();
    }

    async process(job: Job<NotificationJob>): Promise<any> {
        this.logger.debug(`Processing notification job: ${job.id}`);

        try {
            const { type, userId, mobile, title, body, targetAudience } = job.data as any;

            if (type === 'push') {
                await this.sendPushNotification(userId, title, body, targetAudience);
            } else if (type === 'email') {
                await this.sendEmailNotification(userId, title, body);
            } else if (type === 'sms') {
                await this.sendSMS(userId, mobile, body);
            } else if (type === 'whatsapp') {
                await this.sendWhatsApp(userId, mobile, body);
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
        // Always create notification in database (in-app)
        if (userId) {
            await this.prisma.notification.create({
                data: {
                    userId,
                    title,
                    body,
                    type: 'PUSH',
                },
            });

            // Send to FCM if configured and token(s) exist
            const serverKey = process.env.FCM_SERVER_KEY;
            if (!serverKey) {
                this.logger.debug('FCM_SERVER_KEY not configured; skipping external push send');
                return;
            }

            const devices = await (this.prisma as any).userDevice.findMany({
                where: { userId, isActive: true },
                select: { token: true },
                take: 20,
            }).catch(() => []);

            const tokens = devices.map((d: any) => d.token).filter(Boolean);
            if (tokens.length === 0) {
                this.logger.debug(`No active device tokens for user ${userId}`);
                return;
            }

            await axios.post(
                'https://fcm.googleapis.com/fcm/send',
                {
                    registration_ids: tokens,
                    notification: { title, body },
                    data: { title, body },
                },
                {
                    headers: {
                        Authorization: `key=${serverKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 8000,
                },
            );

            this.logger.log(`Push notification delivered to user ${userId} (${tokens.length} devices)`);
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

        const sendgridKey = process.env.SENDGRID_API_KEY;
        const fromEmail = process.env.SENDGRID_FROM_EMAIL;
        if (!sendgridKey || !fromEmail) {
            this.logger.debug('SENDGRID_API_KEY/SENDGRID_FROM_EMAIL not configured; skipping external email send');
            this.logger.log(`Email queued for ${user.email}: ${title}`);
            return;
        }

        await axios.post(
            'https://api.sendgrid.com/v3/mail/send',
            {
                personalizations: [{ to: [{ email: user.email }] }],
                from: { email: fromEmail, name: 'RISBOW' },
                subject: title,
                content: [{ type: 'text/plain', value: body }],
            },
            {
                headers: {
                    Authorization: `Bearer ${sendgridKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 8000,
            },
        );

        this.logger.log(`Email delivered to ${user.email}: ${title}`);
    }
    private async sendSMS(userId: string | undefined, mobile: string | undefined, body: string) {
        let to = mobile;
        if (!to && userId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { mobile: true } });
            to = user?.mobile || undefined;
        }

        if (!to) {
            this.logger.warn('SMS requested but no mobile number found');
            return;
        }

        await this.communication.sendSMS({ to, body });
    }

    private async sendWhatsApp(userId: string | undefined, mobile: string | undefined, body: string) {
        let to = mobile;
        if (!to && userId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { mobile: true } });
            to = user?.mobile || undefined;
        }

        if (!to) {
            this.logger.warn('WhatsApp requested but no mobile number found');
            return;
        }

        await this.communication.sendWhatsApp({ to, body });
    }
}
