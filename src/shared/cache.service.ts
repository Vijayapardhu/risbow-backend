import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import * as crypto from 'crypto';

export interface CacheMetrics {
    hits: number;
    misses: number;
    ratio: number;
}

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private metrics = new Map<string, { hits: number; misses: number }>();
    private pendingPromises = new Map<string, Promise<any>>();

    constructor(private redis: RedisService) { }

    /**
     * Generate cache key with hash for complex filters
     */
    generateKey(prefix: string, params?: Record<string, any>): string {
        if (!params || Object.keys(params).length === 0) {
            return prefix;
        }

        // Sort keys for consistent hashing
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
            }, {} as Record<string, any>);

        const hash = crypto
            .createHash('md5')
            .update(JSON.stringify(sortedParams))
            .digest('hex')
            .substring(0, 8);

        return `${prefix}:${hash}`;
    }

    /**
     * Get cached value with automatic JSON parsing
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const cached = await this.redis.get(key);

            if (cached) {
                this.recordHit(key);
                this.logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(cached) as T;
            }

            this.recordMiss(key);
            this.logger.debug(`Cache MISS: ${key}`);
            return null;
        } catch (error) {
            this.logger.warn(`Cache get error for ${key}: ${error.message}`);
            return null;
        }
    }

    /**
     * Set cached value with automatic JSON serialization
     */
    async set(key: string, value: any, ttlSeconds: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            await this.redis.set(key, serialized, ttlSeconds);
            this.logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
        } catch (error) {
            this.logger.warn(`Cache set error for ${key}: ${error.message}`);
        }
    }

    /**
     * Delete single cache key
     */
    async del(key: string): Promise<void> {
        try {
            await this.redis.del(key);
            this.logger.debug(`Cache DEL: ${key}`);
        } catch (error) {
            this.logger.warn(`Cache delete error for ${key}: ${error.message}`);
        }
    }

    /**
     * Delete multiple keys by pattern
     */
    async delPattern(pattern: string): Promise<void> {
        try {
            await this.redis.delPattern(pattern);
            this.logger.log(`Cache invalidated: ${pattern}`);
        } catch (error) {
            this.logger.warn(`Cache pattern delete error for ${pattern}: ${error.message}`);
        }
    }

    /**
     * Cache-aside pattern: get from cache or execute function
     */
    async getOrSet<T>(
        key: string,
        ttlSeconds: number,
        fetchFn: () => Promise<T>
    ): Promise<T> {
        // Try to get from cache
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Cache miss - check if already fetching
        if (this.pendingPromises.has(key)) {
            // this.logger.debug(`Joining pending fetch for ${key}`); // Optional: Un-comment for deep debugging
            return this.pendingPromises.get(key) as Promise<T>;
        }

        // Create new fetch promise
        const promise = (async () => {
            try {
                const value = await fetchFn();
                // Store in cache for next time
                await this.set(key, value, ttlSeconds);
                return value;
            } catch (error) {
                // If fetch fails, don't cache error, just throw
                throw error;
            } finally {
                this.pendingPromises.delete(key);
            }
        })();

        this.pendingPromises.set(key, promise);
        return promise;
    }

    /**
     * Get cache metrics for monitoring
     */
    getMetrics(): Record<string, CacheMetrics> {
        const result: Record<string, CacheMetrics> = {};

        this.metrics.forEach((value, key) => {
            const total = value.hits + value.misses;
            result[key] = {
                hits: value.hits,
                misses: value.misses,
                ratio: total > 0 ? value.hits / total : 0,
            };
        });

        return result;
    }

    /**
     * Reset metrics (useful for testing)
     */
    resetMetrics(): void {
        this.metrics.clear();
    }

    private recordHit(key: string): void {
        const prefix = this.extractPrefix(key);
        const current = this.metrics.get(prefix) || { hits: 0, misses: 0 };
        current.hits++;
        this.metrics.set(prefix, current);
    }

    private recordMiss(key: string): void {
        const prefix = this.extractPrefix(key);
        const current = this.metrics.get(prefix) || { hits: 0, misses: 0 };
        current.misses++;
        this.metrics.set(prefix, current);
    }

    private extractPrefix(key: string): string {
        // Extract prefix before first colon or hash
        const match = key.match(/^([^:]+)/);
        return match ? match[1] : key;
    }
}
