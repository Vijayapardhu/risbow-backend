import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
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

@Injectable()
export class QueuesService {
    private readonly logger = new Logger(QueuesService.name);

    constructor(
        @InjectQueue('analytics') private analyticsQueue: Queue,
        @InjectQueue('notifications') private notificationsQueue: Queue,
        @InjectQueue('orders') private ordersQueue: Queue,
        @InjectQueue('cleanup') private cleanupQueue: Queue,
    ) { }

    /**
     * Add banner analytics event to queue (batched processing)
     */
    async addBannerAnalytics(job: BannerAnalyticsJob): Promise<void> {
        try {
            await this.analyticsQueue.add('banner-event', job, {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            });
            this.logger.debug(`Queued banner ${job.eventType}: ${job.bannerId}`);
        } catch (error) {
            this.logger.error(`Failed to queue banner analytics: ${error.message}`);
        }
    }

    /**
     * Add notification to queue
     */
    async addNotification(job: NotificationJob): Promise<void> {
        try {
            await this.notificationsQueue.add('send-notification', job, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            });
            this.logger.debug(`Queued notification: ${job.title}`);
        } catch (error) {
            this.logger.error(`Failed to queue notification: ${error.message}`);
        }
    }

    /**
     * Add order processing job
     */
    async addOrderProcessing(job: OrderProcessingJob): Promise<void> {
        try {
            await this.ordersQueue.add(job.action, job, {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                timeout: 30000, // 30 seconds
            });
            this.logger.debug(`Queued order ${job.action}: ${job.orderId}`);
        } catch (error) {
            this.logger.error(`Failed to queue order processing: ${error.message}`);
        }
    }

    /**
     * Schedule cleanup job (called by scheduler)
     */
    async scheduleCleanup(job: CleanupJob): Promise<void> {
        try {
            await this.cleanupQueue.add(job.type, job, {
                attempts: 1, // No retries for cleanup
                removeOnComplete: true,
            });
            this.logger.log(`Scheduled cleanup: ${job.type}`);
        } catch (error) {
            this.logger.error(`Failed to schedule cleanup: ${error.message}`);
        }
    }

    /**
     * Get queue stats for monitoring
     */
    async getQueueStats() {
        const [analytics, notifications, orders, cleanup] = await Promise.all([
            this.analyticsQueue.getJobCounts(),
            this.notificationsQueue.getJobCounts(),
            this.ordersQueue.getJobCounts(),
            this.cleanupQueue.getJobCounts(),
        ]);

        return {
            analytics,
            notifications,
            orders,
            cleanup,
        };
    }
}
