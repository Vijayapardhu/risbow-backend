import { RedisService } from './redis.service';
export interface CacheMetrics {
    hits: number;
    misses: number;
    ratio: number;
}
export declare class CacheService {
    private redis;
    private readonly logger;
    private metrics;
    private pendingPromises;
    constructor(redis: RedisService);
    generateKey(prefix: string, params?: Record<string, any>): string;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds: number): Promise<void>;
    del(key: string): Promise<void>;
    delPattern(pattern: string): Promise<void>;
    getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T>;
    getMetrics(): Record<string, CacheMetrics>;
    resetMetrics(): void;
    private recordHit;
    private recordMiss;
    private extractPrefix;
}
