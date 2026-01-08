export declare class NotificationsService {
    private readonly logger;
    sendPush(userId: string, title: string, body: string): Promise<boolean>;
    sendSMS(mobile: string, message: string): Promise<boolean>;
    sendEmail(email: string, subject: string, content: string): Promise<boolean>;
}
