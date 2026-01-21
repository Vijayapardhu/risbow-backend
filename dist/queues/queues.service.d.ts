import { Queue } from 'bullmq';
export interface BannerAnalyticsJob {
    bannerId: string;
    eventType: 'impression' | 'click';
    timestamp: Date;
    userId?: string;
}
export interface NotificationJob {
    type: 'push' | 'email';
    userId?: string;
    title: string;
    body: string;
    targetAudience?: string;
}
export interface OrderProcessingJob {
    orderId: string;
    action: 'stockDeduction' | 'timeline' | 'coinDebit';
    data: any;
}
export interface CleanupJob {
    type: 'expiredBanners' | 'expiredCoupons' | 'abandonedCheckouts';
}
export declare class QueuesService {
    private analyticsQueue;
    private notificationsQueue;
    private ordersQueue;
    private cleanupQueue;
    private readonly logger;
    constructor(analyticsQueue: Queue, notificationsQueue: Queue, ordersQueue: Queue, cleanupQueue: Queue);
    addBannerAnalytics(job: BannerAnalyticsJob): Promise<void>;
    addNotification(job: NotificationJob): Promise<void>;
    addOrderProcessing(job: OrderProcessingJob): Promise<void>;
    scheduleCleanup(job: CleanupJob): Promise<void>;
    getQueueStats(): Promise<{
        analytics: {
            [index: string]: number;
        };
        notifications: {
            [index: string]: number;
        };
        orders: {
            [index: string]: number;
        };
        cleanup: {
            [index: string]: number;
        };
    }>;
}
