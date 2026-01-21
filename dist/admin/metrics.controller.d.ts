import { CacheService } from '../shared/cache.service';
import { QueuesService } from '../queues/queues.service';
import { CacheMetrics } from '../shared/cache.service';
export declare class MetricsController {
    private cache;
    private queues;
    constructor(cache: CacheService, queues: QueuesService);
    getCacheMetrics(): Promise<{
        timestamp: string;
        metrics: Record<string, CacheMetrics>;
        summary: {
            totalHits: number;
            totalMisses: number;
            averageHitRatio: number;
        };
    }>;
    getQueueStats(): Promise<{
        timestamp: string;
        queues: {
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
        };
    }>;
}
