import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CleanupJob } from '../queues.service';

@Processor('cleanup', {
    concurrency: 1, // Run cleanup jobs sequentially
})
export class CleanupProcessor extends WorkerHost {
    private readonly logger = new Logger(CleanupProcessor.name);

    constructor(private prisma: PrismaService) {
        super();
    }

    async process(job: Job<CleanupJob>): Promise<any> {
        this.logger.log(`Processing cleanup job: ${job.data.type}`);

        try {
            const { type } = job.data;

            switch (type) {
                case 'expiredBanners':
                    return await this.cleanupExpiredBanners();
                case 'expiredCoupons':
                    return await this.cleanupExpiredCoupons();
                case 'abandonedCheckouts':
                    return await this.cleanupAbandonedCheckouts();
                default:
                    throw new Error(`Unknown cleanup type: ${type}`);
            }
        } catch (error) {
            this.logger.error(`Cleanup job failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async cleanupExpiredBanners() {
        const now = new Date();

        const result = await this.prisma.banner.updateMany({
            where: {
                endDate: { lt: now },
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });

        this.logger.log(`Deactivated ${result.count} expired banners`);
        return { success: true, deactivated: result.count };
    }

    private async cleanupExpiredCoupons() {
        const now = new Date();

        const result = await this.prisma.coupon.updateMany({
            where: {
                validUntil: { lt: now },
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });

        this.logger.log(`Deactivated ${result.count} expired coupons`);
        return { success: true, deactivated: result.count };
    }

    private async cleanupAbandonedCheckouts() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await this.prisma.abandonedCheckout.deleteMany({
            where: {
                abandonedAt: { lt: thirtyDaysAgo },
                status: 'DROPPED',
            },
        });

        this.logger.log(`Deleted ${result.count} old abandoned checkouts`);
        return { success: true, deleted: result.count };
    }
}
