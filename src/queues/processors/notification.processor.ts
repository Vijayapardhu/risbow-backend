import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationJob } from '../queues.service';
import axios from 'axios';
import { CommunicationService } from '../../shared/communication.service';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'crypto';

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
                    id: randomUUID(),
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

            // Try to get device tokens from UserDevice table (if exists) or User metadata
            let tokens: string[] = [];
            
            // Method 1: Check UserDevice table (if exists)
            try {
                const devices = await (this.prisma as any).userDevice.findMany({
                    where: { userId, isActive: true },
                    select: { token: true },
                    take: 20,
                }).catch(() => []);
                tokens = devices.map((d: any) => d.token).filter(Boolean);
            } catch (error) {
                // UserDevice table might not exist, try alternative
            }

            // Method 2: Check User metadata for device tokens (fallback)
            if (tokens.length === 0) {
                try {
                    const user = await this.prisma.user.findUnique({
                        where: { id: userId },
                        select: { metadata: true },
                    });
                    const metadata = user?.metadata as any;
                    if (metadata?.deviceTokens && Array.isArray(metadata.deviceTokens)) {
                        tokens = metadata.deviceTokens.filter((t: string) => t && t.length > 0);
                    }
                } catch (error) {
                    // Ignore
                }
            }

            if (tokens.length === 0) {
                this.logger.debug(`No active device tokens for user ${userId}`);
                return;
            }

            // Use FCM HTTP v1 API (more reliable than legacy API)
            // For now, use legacy API for compatibility, but can upgrade to v1
            try {
                await axios.post(
                    'https://fcm.googleapis.com/fcm/send',
                    {
                        registration_ids: tokens,
                        notification: {
                            title,
                            body,
                            sound: 'default',
                            badge: '1',
                        },
                        data: {
                            title,
                            body,
                            type: 'notification',
                        },
                        priority: 'high',
                    },
                    {
                        headers: {
                            Authorization: `key=${serverKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 10000,
                    },
                );

                this.logger.log(`Push notification delivered to user ${userId} (${tokens.length} devices)`);
            } catch (error: any) {
                this.logger.error(`FCM push notification failed: ${error.message}`);
                // Don't throw - notification is already in DB
            }
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

        // Try SendGrid first, then AWS SES as fallback
        const awsSesRegion = process.env.AWS_SES_REGION;
        const awsSesAccessKey = process.env.AWS_SES_ACCESS_KEY;
        const awsSesSecretKey = process.env.AWS_SES_SECRET_KEY;

        // Try SendGrid
        if (sendgridKey && fromEmail) {
            try {
                await axios.post(
                    'https://api.sendgrid.com/v3/mail/send',
                    {
                        personalizations: [{ to: [{ email: user.email, name: user.name || undefined }] }],
                        from: { email: fromEmail, name: 'RISBOW' },
                        subject: title,
                        content: [
                            { type: 'text/plain', value: body },
                            { type: 'text/html', value: this.formatEmailHTML(title, body) },
                        ],
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${sendgridKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 10000,
                    },
                );
                this.logger.log(`Email delivered via SendGrid to ${user.email}: ${title}`);
                return;
            } catch (error: any) {
                this.logger.error(`SendGrid email failed: ${error.message}`);
                // Fall through to AWS SES
            }
        }

        // Try AWS SES as fallback
        if (awsSesRegion && awsSesAccessKey && awsSesSecretKey) {
            try {
                const sesClient = new SESClient({
                    region: awsSesRegion,
                    credentials: {
                        accessKeyId: awsSesAccessKey,
                        secretAccessKey: awsSesSecretKey,
                    },
                });

                const fromEmail = process.env.AWS_SES_FROM_EMAIL || 'noreply@risbow.com';

                const command = new SendEmailCommand({
                    Source: fromEmail,
                    Destination: {
                        ToAddresses: [user.email],
                    },
                    Message: {
                        Subject: {
                            Data: title,
                            Charset: 'UTF-8',
                        },
                        Body: {
                            Html: {
                                Data: this.formatEmailHTML(title, body),
                                Charset: 'UTF-8',
                            },
                            Text: {
                                Data: body,
                                Charset: 'UTF-8',
                            },
                        },
                    },
                });

                const result = await sesClient.send(command);
                this.logger.log(`Email delivered via AWS SES to ${user.email}: ${title} (MessageId: ${result.MessageId})`);
                return;
            } catch (error: any) {
                this.logger.error(`AWS SES email failed: ${error.message}`);
            }
        }

        this.logger.warn(`No email provider configured. Email not sent to ${user.email}: ${title}`);
    }

    private formatEmailHTML(title: string, body: string) {
        const escape = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapedTitle = escape(title);
        const escapedBody = escape(body).replace(/\n/g, '<br/>');
        return `<!doctype html><html><head><meta charset="utf-8"/></head><body style="font-family: Arial, sans-serif; line-height: 1.5;"><h2>${escapedTitle}</h2><div>${escapedBody}</div><hr/><div style="font-size:12px;color:#666;">RISBOW</div></body></html>`;
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
