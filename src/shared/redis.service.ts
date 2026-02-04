import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client?: Redis;
    private readonly logger = new Logger(RedisService.name);
    private inMemoryStore = new Map<string, { value: string; expiresAt: number }>();
    private useMemory = false;

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        const disableRedis = this.configService.get<string>('DISABLE_REDIS');
        if (disableRedis === 'true' || disableRedis === '1') {
            this.useMemory = true;
            this.logger.warn('DISABLE_REDIS=true; using in-memory store (no Redis connection)');
            return;
        }
        const host = this.configService.get<string>('REDIS_HOST');
        const port = parseInt(this.configService.get<string>('REDIS_PORT')) || 6379;
        const username = this.configService.get<string>('REDIS_USERNAME');
        const password = this.configService.get<string>('REDIS_PASSWORD');
        const useTls = this.configService.get<string>('REDIS_TLS') === 'true' || this.configService.get<string>('REDIS_TLS') === '1';

        if (!host) {
            this.useMemory = true;
            this.logger.warn('REDIS_HOST not set; falling back to in-memory store');
            return;
        }

        this.client = new Redis({
            host,
            port,
            username,
            password,
            tls: useTls ? {} : undefined, // Azure Redis requires TLS
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // Do not spam reconnect attempts
            enableOfflineQueue: false,
            // Connection pooling to prevent "max clients reached" errors
            keepAlive: 30000, // Keep connection alive
            connectTimeout: 10000, // 10 second timeout
            // Reuse connections
            family: 4, // Use IPv4
        });

        this.client.on('error', (err) => {
            // Only log once, then switch to in-memory silently
            if (!this.useMemory) {
                this.logger.warn(`Redis unavailable, switching to in-memory store`);
                this.useMemory = true;
            }
            // Suppress further error logs
        });

        try {
            await this.client.connect();
            this.logger.log(`Connected to Redis at ${host}:${port}`);
        } catch (err) {
            this.logger.warn(`Redis connect failed, switching to in-memory store: ${err.message}`);
            this.useMemory = true;
            await this.client.quit().catch(() => undefined);
            this.client = undefined;
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit().catch(() => undefined);
        }
    }

    async setOtp(mobile: string, otp: string) {
        // TTL 5 mins = 300s
        if (this.useMemory) {
            this.inMemoryStore.set(mobile, { value: otp, expiresAt: Date.now() + 300_000 });
            return;
        }
        await this.client.set(`otp:${mobile}`, otp, 'EX', 300);
    }

    async getOtp(mobile: string): Promise<string | null> {
        if (this.useMemory) {
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
        if (this.useMemory) {
            this.inMemoryStore.delete(mobile);
            return;
        }
        await this.client.del(`otp:${mobile}`);
    }

    // Generic methods for caching
    async get(key: string): Promise<string | null> {
        if (this.useMemory) {
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
        if (this.useMemory) {
            this.inMemoryStore.set(key, {
                value,
                expiresAt: Date.now() + (ttlSeconds * 1000)
            });
            return;
        }
        await this.client.set(key, value, 'EX', ttlSeconds);
    }

    async del(key: string) {
        if (this.useMemory) {
            this.inMemoryStore.delete(key);
            return;
        }
        await this.client.del(key);
    }

    // Batch operations for performance
    async mget(keys: string[]): Promise<(string | null)[]> {
        if (this.useMemory) {
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
        if (this.useMemory) {
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

    async lpush(key: string, value: string): Promise<number> {
        if (this.useMemory) {
            // In-memory lists are not directly supported with lpush semantics
            // For simplicity, we'll just store the last value for the key
            // A more robust in-memory implementation would need a Map<string, string[]>
            this.inMemoryStore.set(key, { value, expiresAt: Infinity }); // No expiry for list items
            return 1; // Indicate one item pushed
        }
        return this.client.lpush(key, value);
    }

    async ltrim(key: string, start: number, stop: number): Promise<string> {
        if (this.useMemory) {
            // In-memory lists are not directly supported with ltrim semantics
            // This method would effectively do nothing or clear the key if start/stop implies empty
            if (start > stop || start < 0) {
                this.inMemoryStore.delete(key);
            }
            return 'OK';
        }
        return this.client.ltrim(key, start, stop);
    }

    async lrange(key: string, start: number, stop: number): Promise<string[]> {
        if (this.useMemory) {
            // In-memory lists are not directly supported with lrange semantics
            // Return an array containing the single stored value if it exists
            const entry = this.inMemoryStore.get(key);
            if (entry && entry.expiresAt >= Date.now()) {
                return [entry.value];
            }
            return [];
        }
        return this.client.lrange(key, start, stop);
    }

    // Delete keys by pattern (e.g., "products:*")
    async delPattern(pattern: string): Promise<number> {
        if (this.useMemory) {
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
        if (this.useMemory) {
            const entry = this.inMemoryStore.get(key);
            const next = (entry ? parseInt(entry.value, 10) || 0 : 0) + 1;
            this.inMemoryStore.set(key, { value: String(next), expiresAt: Infinity });
            return next;
        }
        if (!this.client) return 0;
        return this.client.incr(key);
    }

    async incrBy(key: string, value: number): Promise<number> {
        if (this.useMemory) {
            const entry = this.inMemoryStore.get(key);
            const next = (entry ? parseInt(entry.value, 10) || 0 : 0) + value;
            this.inMemoryStore.set(key, { value: String(next), expiresAt: Infinity });
            return next;
        }
        if (!this.client) return 0;
        return this.client.incrby(key, value);
    }

    async decrBy(key: string, value: number): Promise<number> {
        if (this.useMemory) {
            const entry = this.inMemoryStore.get(key);
            const next = (entry ? parseInt(entry.value, 10) || 0 : 0) - value;
            this.inMemoryStore.set(key, { value: String(next), expiresAt: Infinity });
            return next;
        }
        if (!this.client) return 0;
        return this.client.decrby(key, value);
    }

    async expire(key: string, seconds: number): Promise<number> {
        if (this.useMemory) {
            const entry = this.inMemoryStore.get(key);
            if (!entry) return 0;
            entry.expiresAt = Date.now() + seconds * 1000;
            return 1;
        }
        if (!this.client) return 0;
        return this.client.expire(key, seconds);
    }

    // 🔐 P0 FIX: Add SETNX for atomic lock acquisition
    async setnx(key: string, value: string): Promise<number> {
        if (this.useMemory) {
            // In-memory fallback
            if (this.inMemoryStore.has(key)) {
                return 0; // Key exists
            }
            this.inMemoryStore.set(key, { value, expiresAt: Date.now() + 10000 });
            return 1; // Key set
        }
        return await this.client.setnx(key, value);
    }

    async exists(key: string): Promise<boolean> {
        if (this.useMemory) {
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

    // Sorted Set Operations
    async zincrby(key: string, increment: number, member: string): Promise<string | number> {
        if (this.useMemory) {
            // Very basic in-memory simulating sorted set with just map
            // Note: This does NOT implement sorting, just storage for dev
            const current = this.inMemoryStore.get(`${key}:${member}`);
            const newVal = (current ? parseFloat(current.value) : 0) + increment;
            this.inMemoryStore.set(`${key}:${member}`, { value: newVal.toString(), expiresAt: Infinity });
            return newVal;
        }
        return this.client.zincrby(key, increment, member);
    }

    async zrevrange(key: string, start: number, stop: number, withScores: 'WITHSCORES'): Promise<string[]> {
        if (this.useMemory) {
            // In-memory fallback: scan keys with prefix, sort, return
            // This is expensive but okay for dev fallback
            const result: { member: string, score: number }[] = [];
            for (const k of this.inMemoryStore.keys()) {
                if (k.startsWith(`${key}:`)) {
                    const member = k.split(`${key}:`)[1];
                    const score = parseFloat(this.inMemoryStore.get(k)!.value);
                    result.push({ member, score });
                }
            }
            result.sort((a, b) => b.score - a.score);
            const sliced = result.slice(start, stop + 1);

            // Format as [member, score, member, score]
            const flat: string[] = [];
            sliced.forEach(x => { flat.push(x.member); flat.push(x.score.toString()); });
            return flat;
        }
        return this.client.zrevrange(key, start, stop, withScores);
    }

    /**
     * Get all keys matching a pattern (use with caution in production)
     * For production, prefer SCAN-based iteration
     */
    async keys(pattern: string): Promise<string[]> {
        if (this.useMemory) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            const matchingKeys: string[] = [];
            for (const key of this.inMemoryStore.keys()) {
                if (regex.test(key)) {
                    const entry = this.inMemoryStore.get(key);
                    if (entry && entry.expiresAt >= Date.now()) {
                        matchingKeys.push(key);
                    }
                }
            }
            return matchingKeys;
        }

        // Use SCAN for production-safe key iteration
        const keys: string[] = [];
        let cursor = '0';
        do {
            const [newCursor, foundKeys] = await this.client.scan(
                cursor,
                'MATCH',
                pattern,
                'COUNT',
                100
            );
            cursor = newCursor;
            keys.push(...foundKeys);
        } while (cursor !== '0');

        return keys;
    }
}
