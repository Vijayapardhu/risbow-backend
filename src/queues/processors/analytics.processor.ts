import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { BannerAnalyticsJob } from '../queues.service';

@Processor('analytics', {
    concurrency: 5,
})
export class AnalyticsProcessor extends WorkerHost {
    private readonly logger = new Logger(AnalyticsProcessor.name);
    private batchBuffer: BannerAnalyticsJob[] = [];
    private batchTimer: NodeJS.Timeout | null = null;
    private readonly batchWindowMs = 5000;
    private readonly maxBatchSize = 500;

    constructor(private prisma: PrismaService) {
        super();
    }

    async process(job: Job<BannerAnalyticsJob>): Promise<any> {
        this.logger.debug(`Processing analytics job: ${job.id}`);

        try {
            const { bannerId, eventType, timestamp } = job.data;

            // Buffer the event for batch flush
            this.batchBuffer.push({ bannerId, eventType, timestamp, userId: job.data.userId });

            // Flush if buffer gets large
            if (this.batchBuffer.length >= this.maxBatchSize) {
                await this.flushBatch().catch((e) => {
                    this.logger.error(`Analytics batch flush failed: ${e.message}`, e.stack);
                });
                return { success: true, bannerId, eventType, flushed: true };
            }

            // Schedule flush
            if (!this.batchTimer) {
                this.batchTimer = setTimeout(() => {
                    this.flushBatch().catch((e) => {
                        this.logger.error(`Analytics batch flush failed: ${e.message}`, e.stack);
                    });
                }, this.batchWindowMs);
            }

            return { success: true, bannerId, eventType, buffered: true };
        } catch (error) {
            this.logger.error(`Analytics job failed: ${error.message}`, error.stack);
            throw error; // Will trigger retry
        }
    }

    /**
     * Batch process analytics events
     * This would be called periodically to flush the batch buffer
     */
    private async flushBatch() {
        if (this.batchBuffer.length === 0) return;

        const batch = [...this.batchBuffer];
        this.batchBuffer = [];
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        this.logger.log(`Flushing ${batch.length} analytics events`);

        // Group by bannerId and eventType
        const grouped = batch.reduce((acc, event) => {
            const key = `${event.bannerId}:${event.eventType}`;
            if (!acc[key]) {
                acc[key] = { bannerId: event.bannerId, eventType: event.eventType, count: 0 };
            }
            acc[key].count++;
            return acc;
        }, {} as Record<string, { bannerId: string; eventType: string; count: number }>);

        // Batch update Banner.metadata.analytics counters (JSONB) atomically in SQL
        for (const key in grouped) {
            const { bannerId, eventType, count } = grouped[key];

            if (eventType === 'impression') {
                await this.prisma.$executeRaw`
                  UPDATE "Banner"
                  SET "metadata" = jsonb_set(
                    COALESCE("metadata", '{}'::jsonb),
                    '{analytics,impressions}',
                    to_jsonb(COALESCE(("metadata"->'analytics'->>'impressions')::int, 0) + ${count}),
                    true
                  )
                  WHERE "id" = ${bannerId};
                `;
            } else if (eventType === 'click') {
                await this.prisma.$executeRaw`
                  UPDATE "Banner"
                  SET "metadata" = jsonb_set(
                    COALESCE("metadata", '{}'::jsonb),
                    '{analytics,clicks}',
                    to_jsonb(COALESCE(("metadata"->'analytics'->>'clicks')::int, 0) + ${count}),
                    true
                  )
                  WHERE "id" = ${bannerId};
                `;
            }

            this.logger.debug(`Banner ${bannerId}: +${count} ${eventType}(s)`);
        }
    }
}
