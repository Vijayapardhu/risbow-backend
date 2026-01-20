import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createNotification(userId: string, title: string, body: string, type: string, targetAudience?: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        userId: string | null;
        title: string;
        body: string;
        targetAudience: string | null;
        isRead: boolean;
    }>;
    sendPush(userId: string, title: string, body: string): Promise<boolean>;
    sendSMS(mobile: string, message: string): Promise<boolean>;
    sendEmail(email: string, subject: string, content: string): Promise<boolean>;
}
