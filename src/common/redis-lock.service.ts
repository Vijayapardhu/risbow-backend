import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../shared/redis.service';
import * as crypto from 'crypto';

/**
 * Redis Lock Service
 * 
 * Provides distributed locking for cron jobs and background tasks
 * to prevent concurrent execution across multiple instances.
 * 
 * Uses atomic SET NX EX for acquisition and Lua script for
 * ownership-verified release (no accidental unlock by other holders).
 */
@Injectable()
export class RedisLockService {
    private readonly logger = new Logger(RedisLockService.name);
    private readonly defaultLockTTL = 300; // 5 minutes default lock duration

    /**
     * Map of lock keys to their owner values for this instance.
     * Used to verify ownership before release.
     */
    private readonly lockOwnership = new Map<string, string>();

    constructor(private redisService: RedisService) {}

    /**
     * Acquires a distributed lock atomically using SET key value NX EX ttl.
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
        // Generate a unique owner value for this lock holder
        const lockValue = `${process.pid}-${crypto.randomBytes(8).toString('hex')}`;

        // Atomic SET NX EX — acquires lock AND sets TTL in a single command
        const acquired = await this.redisService.setNxEx(fullLockKey, lockValue, ttlSeconds);

        if (acquired) {
            // Store the owner value so we can verify on release
            this.lockOwnership.set(fullLockKey, lockValue);
            this.logger.debug(`Lock acquired: ${lockKey} (owner: ${lockValue})`);
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
     * Releases a distributed lock ONLY if the caller is the current owner.
     * Uses a Lua script to make the check-and-delete atomic.
     * 
     * @param lockKey - The lock key to release
     */
    async releaseLock(lockKey: string): Promise<void> {
        const fullLockKey = `lock:${lockKey}`;
        const expectedValue = this.lockOwnership.get(fullLockKey);

        if (!expectedValue) {
            this.logger.warn(`Cannot release lock ${lockKey}: no ownership record found (was it already released?)`);
            return;
        }

        // Atomic check-and-delete: only delete if the value matches our owner value
        const released = await this.redisService.delIfEqual(fullLockKey, expectedValue);

        if (released) {
            this.logger.debug(`Lock released: ${lockKey}`);
        } else {
            this.logger.warn(`Lock ${lockKey} was NOT released: ownership mismatch or already expired`);
        }

        // Clean up local ownership tracking regardless
        this.lockOwnership.delete(fullLockKey);
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
     * Extends the TTL of an existing lock ONLY if the caller owns it.
     * 
     * @param lockKey - The lock key
     * @param ttlSeconds - New TTL in seconds
     * @returns true if lock was extended, false if lock doesn't exist or not owned
     */
    async extendLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
        const fullLockKey = `lock:${lockKey}`;
        const expectedValue = this.lockOwnership.get(fullLockKey);

        if (!expectedValue) {
            this.logger.warn(`Cannot extend lock ${lockKey}: no ownership record found`);
            return false;
        }

        // Verify ownership before extending
        const currentValue = await this.redisService.get(fullLockKey);
        if (currentValue !== expectedValue) {
            this.logger.warn(`Cannot extend lock ${lockKey}: ownership mismatch`);
            this.lockOwnership.delete(fullLockKey);
            return false;
        }

        await this.redisService.expire(fullLockKey, ttlSeconds);
        return true;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
