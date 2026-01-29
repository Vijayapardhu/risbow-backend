import { Injectable, Logger } from '@nestjs/common';
import type {
    BannerAnalyticsJob,
    NotificationJob,
    OrderProcessingJob,
    CleanupJob,
    CartIntelligenceJob,
} from './queues.service';

/**
 * No-op QueuesService when Redis is disabled.
 * All queue operations are skipped; app runs without Bull/Redis.
 */
@Injectable()
export class QueuesServiceStub {
    private readonly logger = new Logger(QueuesServiceStub.name);

    async addBannerAnalytics(_job: BannerAnalyticsJob): Promise<void> {
        this.logger.debug('Redis disabled: skip banner analytics queue');
    }

    async addNotification(_job: NotificationJob): Promise<void> {
        this.logger.debug('Redis disabled: skip notification queue');
    }

    async addOrderProcessing(_job: OrderProcessingJob): Promise<void> {
        this.logger.debug('Redis disabled: skip order processing queue');
    }

    async scheduleCleanup(_job: CleanupJob): Promise<void> {
        this.logger.debug('Redis disabled: skip cleanup queue');
    }

    async addCartIntelligence(_job: CartIntelligenceJob): Promise<void> {
        this.logger.debug('Redis disabled: skip cart intelligence queue');
    }

    async getQueueStats() {
        return {
            analytics: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
            notifications: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
            orders: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
            cleanup: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
            cartIntelligence: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        };
    }
}
