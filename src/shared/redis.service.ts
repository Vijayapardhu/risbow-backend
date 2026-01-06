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

        if (!host) {
            this.useMemory = true;
            this.logger.warn('REDIS_HOST not set; falling back to in-memory OTP store');
            return;
        }

        this.client = new Redis({
            host,
            port,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // Do not spam reconnect attempts
            enableOfflineQueue: false,
        });

        this.client.on('error', (err) => {
            if (!this.useMemory) {
                this.logger.warn(`Redis unavailable, using in-memory store. Error: ${err.message}`);
                this.useMemory = true;
            }
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
}
