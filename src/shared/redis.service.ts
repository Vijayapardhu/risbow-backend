import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client?: Redis;
    private readonly logger = new Logger(RedisService.name);
    private inMemoryStore = new Map<string, { value: string; expiresAt: number }>();
    private useMemory = false;

    async onModuleInit() {
        const host = process.env.REDIS_HOST;
        const port = parseInt(process.env.REDIS_PORT) || 6379;
        const username = process.env.REDIS_USERNAME;
        const password = process.env.REDIS_PASSWORD;

        if (!host) {
            this.useMemory = true;
            this.logger.warn('REDIS_HOST not set; falling back to in-memory OTP store');
            return;
        }

        this.client = new Redis({
            host,
            port,
            username,
            password,
            lazyConnect: true,
            maxRetriesPerRequest: 0, // Fail fast, no retries
            retryStrategy: () => null, // Do not spam reconnect attempts
            enableOfflineQueue: false,
            connectTimeout: 1000, // 1 second timeout for connection
            autoResubscribe: false,
            autoResendUnfulfilledCommands: false,
        });

        let errorLogged = false; // Track if we've already logged the error to avoid spam

        this.client.on('error', (err) => {
            if (!errorLogged && !this.useMemory) {
                this.logger.warn(`Redis connection failed, switching to in-memory store`);
                errorLogged = true;
                this.useMemory = true;
            }
        });

        try {
            await this.client.connect();
            this.logger.log(`Connected to Redis at ${host}:${port}`);
        } catch (err) {
            if (!errorLogged) {
                this.logger.warn(`Redis connection failed, switching to in-memory store`);
            }
            this.useMemory = true;
            // Disconnect and cleanup to prevent further connection attempts
            if (this.client) {
                this.client.removeAllListeners();
                try {
                    this.client.disconnect(false); // Disconnect without retry
                } catch (e) {
                    // Ignore disconnect errors
                }
                this.client = undefined;
            }
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit().catch(() => undefined);
        }
    }

    async setOtp(mobile: string, otp: string) {
        // TTL 5 mins = 300s
        if (this.useMemory || !this.client) {
            this.inMemoryStore.set(mobile, { value: otp, expiresAt: Date.now() + 300_000 });
            return;
        }
        await this.client.set(`otp:${mobile}`, otp, 'EX', 300);
    }

    async getOtp(mobile: string): Promise<string | null> {
        if (this.useMemory || !this.client) {
            const entry = this.inMemoryStore.get(mobile);
            if (!entry) return null;
            if (entry.expiresAt < Date.now()) {
                this.inMemoryStore.delete(mobile);
                return null;
            }
            return entry.value;
        }
        return this.client.get(`otp:${mobile}`);
    }

    async delOtp(mobile: string) {
        if (this.useMemory || !this.client) {
            this.inMemoryStore.delete(mobile);
            return;
        }
        await this.client.del(`otp:${mobile}`);
    }

    // Generic methods for caching
    async get(key: string): Promise<string | null> {
        if (this.useMemory || !this.client) {
            const entry = this.inMemoryStore.get(key);
            if (!entry) return null;
            if (entry.expiresAt < Date.now()) {
                this.inMemoryStore.delete(key);
                return null;
            }
            return entry.value;
        }
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds: number) {
        if (this.useMemory || !this.client) {
            this.inMemoryStore.set(key, {
                value,
                expiresAt: Date.now() + (ttlSeconds * 1000)
            });
            return;
        }
        await this.client.set(key, value, 'EX', ttlSeconds);
    }

    async del(key: string) {
        if (this.useMemory || !this.client) {
            this.inMemoryStore.delete(key);
            return;
        }
        await this.client.del(key);
    }

    // Batch operations for performance
    async mget(keys: string[]): Promise<(string | null)[]> {
        if (this.useMemory || !this.client) {
            return keys.map(key => {
                const entry = this.inMemoryStore.get(key);
                if (!entry) return null;
                if (entry.expiresAt < Date.now()) {
                    this.inMemoryStore.delete(key);
                    return null;
                }
                return entry.value;
            });
        }
        return this.client.mget(...keys);
    }

    async mset(keyValues: Record<string, string>, ttlSeconds: number) {
        if (this.useMemory || !this.client) {
            Object.entries(keyValues).forEach(([key, value]) => {
                this.inMemoryStore.set(key, {
                    value,
                    expiresAt: Date.now() + (ttlSeconds * 1000)
                });
            });
            return;
        }

        // Use pipeline for atomic multi-set with TTL
        const pipeline = this.client.pipeline();
        Object.entries(keyValues).forEach(([key, value]) => {
            pipeline.set(key, value, 'EX', ttlSeconds);
        });
        await pipeline.exec();
    }

    // Delete keys by pattern (e.g., "products:*")
    async delPattern(pattern: string): Promise<number> {
        if (this.useMemory || !this.client) {
            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
            let count = 0;
            for (const key of this.inMemoryStore.keys()) {
                if (regex.test(key)) {
                    this.inMemoryStore.delete(key);
                    count++;
                }
            }
            return count;
        }

        // Use SCAN to avoid blocking
        let cursor = '0';
        let deletedCount = 0;

        do {
            const [newCursor, keys] = await this.client.scan(
                cursor,
                'MATCH',
                pattern,
                'COUNT',
                100
            );
            cursor = newCursor;

            if (keys.length > 0) {
                deletedCount += await this.client.del(...keys);
            }
        } while (cursor !== '0');

        return deletedCount;
    }

    async incr(key: string): Promise<number> {
        if (!this.client) return 0; // Fallback
        return this.client.incr(key);
    }

    async incrBy(key: string, value: number): Promise<number> {
        if (!this.client) return 0;
        return this.client.incrby(key, value);
    }

    async decrBy(key: string, value: number): Promise<number> {
        if (!this.client) return 0;
        return this.client.decrby(key, value);
    }

    async expire(key: string, seconds: number): Promise<number> {
        if (!this.client) return 0;
        return this.client.expire(key, seconds);
    }

    async exists(key: string): Promise<boolean> {
        if (this.useMemory || !this.client) {
            const entry = this.inMemoryStore.get(key);
            if (!entry) return false;
            if (entry.expiresAt < Date.now()) {
                this.inMemoryStore.delete(key);
                return false;
            }
            return true;
        }
        return (await this.client.exists(key)) === 1;
    }

    // Get connection status
    isConnected(): boolean {
        return !this.useMemory && this.client?.status === 'ready';
    }
}
