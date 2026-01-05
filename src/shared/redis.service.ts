import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    onModuleInit() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            lazyConnect: true // Don't crash if no redis immediately
        });
    }

    onModuleDestroy() {
        this.client.disconnect();
    }

    async setOtp(mobile: string, otp: string) {
        // TTL 5 mins = 300s
        await this.client.set(`otp:${mobile}`, otp, 'EX', 300);
    }

    async getOtp(mobile: string): Promise<string> {
        return this.client.get(`otp:${mobile}`);
    }

    async delOtp(mobile: string) {
        await this.client.del(`otp:${mobile}`);
    }
}
