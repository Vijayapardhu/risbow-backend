import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../shared/redis.service';

/**
 * Redis Lock Service
 * 
 * Provides distributed locking for cron jobs and background tasks
 * to prevent concurrent execution across multiple instances.
 */
@Injectable()
export class RedisLockService {
    private readonly logger = new Logger(RedisLockService.name);
    private readonly defaultLockTTL = 300; // 5 minutes default lock duration

    constructor(private redisService: RedisService) {}

    /**
     * Acquires a distributed lock.
     * 
     * @param lockKey - Unique key for the lock
     * @param ttlSeconds - Lock duration in seconds (default: 5 minutes)
     * @param retryAttempts - Number of retry attempts (default: 0, no retry)
     * @param retryDelayMs - Delay between retries in milliseconds (default: 1000)
     * @returns true if lock acquired, false otherwise
     */
    async acquireLock(
        lockKey: string,
        ttlSeconds: number = this.defaultLockTTL,
        retryAttempts: number = 0,
        retryDelayMs: number = 1000,
    ): Promise<boolean> {
        const fullLockKey = `lock:${lockKey}`;
        const lockValue = `${Date.now()}-${Math.random()}`;

        // Try to acquire lock using SETNX (set if not exists)
        const acquired = await this.redisService.setnx(fullLockKey, lockValue);

        if (acquired === 1) {
            // Lock acquired, set TTL
            await this.redisService.expire(fullLockKey, ttlSeconds).catch(() => {
                // If expire fails, try to release the lock
                this.redisService.del(fullLockKey).catch(() => {});
            });
            this.logger.debug(`Lock acquired: ${lockKey}`);
            return true;
        }

        // Lock already held by another instance
        if (retryAttempts > 0) {
            this.logger.debug(`Lock ${lockKey} held, retrying... (${retryAttempts} attempts left)`);
            await this.sleep(retryDelayMs);
            return this.acquireLock(lockKey, ttlSeconds, retryAttempts - 1, retryDelayMs);
        }

        this.logger.debug(`Lock ${lockKey} already held by another instance, skipping execution`);
        return false;
    }

    /**
     * Releases a distributed lock.
     * 
     * @param lockKey - The lock key to release
     */
    async releaseLock(lockKey: string): Promise<void> {
        const fullLockKey = `lock:${lockKey}`;
        await this.redisService.del(fullLockKey).catch((err) => {
            this.logger.warn(`Failed to release lock ${lockKey}: ${err.message}`);
        });
        this.logger.debug(`Lock released: ${lockKey}`);
    }

    /**
     * Executes a function with a distributed lock.
     * Automatically acquires and releases the lock.
     * 
     * @param lockKey - Unique key for the lock
     * @param fn - Function to execute
     * @param ttlSeconds - Lock duration in seconds
     * @returns Result of the function, or null if lock could not be acquired
     */
    async withLock<T>(
        lockKey: string,
        fn: () => Promise<T>,
        ttlSeconds: number = this.defaultLockTTL,
    ): Promise<T | null> {
        const acquired = await this.acquireLock(lockKey, ttlSeconds);

        if (!acquired) {
            return null;
        }

        try {
            const result = await fn();
            return result;
        } finally {
            await this.releaseLock(lockKey);
        }
    }

    /**
     * Checks if a lock is currently held.
     * 
     * @param lockKey - The lock key to check
     * @returns true if lock is held, false otherwise
     */
    async isLocked(lockKey: string): Promise<boolean> {
        const fullLockKey = `lock:${lockKey}`;
        return await this.redisService.exists(fullLockKey);
    }

    /**
     * Extends the TTL of an existing lock.
     * 
     * @param lockKey - The lock key
     * @param ttlSeconds - New TTL in seconds
     * @returns true if lock was extended, false if lock doesn't exist
     */
    async extendLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
        const fullLockKey = `lock:${lockKey}`;
        const exists = await this.redisService.exists(fullLockKey);
        
        if (exists) {
            await this.redisService.expire(fullLockKey, ttlSeconds);
            return true;
        }
        
        return false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
