"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let RedisService = RedisService_1 = class RedisService {
    constructor() {
        this.logger = new common_1.Logger(RedisService_1.name);
        this.inMemoryStore = new Map();
        this.useMemory = false;
    }
    async onModuleInit() {
        const host = process.env.REDIS_HOST;
        const port = parseInt(process.env.REDIS_PORT) || 6379;
        if (!host) {
            this.useMemory = true;
            this.logger.warn('REDIS_HOST not set; falling back to in-memory OTP store');
            return;
        }
        this.client = new ioredis_1.Redis({
            host,
            port,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
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
        }
        catch (err) {
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
    async setOtp(mobile, otp) {
        if (this.useMemory) {
            this.inMemoryStore.set(mobile, { value: otp, expiresAt: Date.now() + 300_000 });
            return;
        }
        await this.client.set(`otp:${mobile}`, otp, 'EX', 300);
    }
    async getOtp(mobile) {
        if (this.useMemory) {
            const entry = this.inMemoryStore.get(mobile);
            if (!entry)
                return null;
            if (entry.expiresAt < Date.now()) {
                this.inMemoryStore.delete(mobile);
                return null;
            }
            return entry.value;
        }
        return this.client.get(`otp:${mobile}`);
    }
    async delOtp(mobile) {
        if (this.useMemory) {
            this.inMemoryStore.delete(mobile);
            return;
        }
        await this.client.del(`otp:${mobile}`);
    }
    async get(key) {
        if (this.useMemory) {
            const entry = this.inMemoryStore.get(key);
            if (!entry)
                return null;
            if (entry.expiresAt < Date.now()) {
                this.inMemoryStore.delete(key);
                return null;
            }
            return entry.value;
        }
        return this.client.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (this.useMemory) {
            this.inMemoryStore.set(key, {
                value,
                expiresAt: Date.now() + (ttlSeconds * 1000)
            });
            return;
        }
        await this.client.set(key, value, 'EX', ttlSeconds);
    }
    async del(key) {
        if (this.useMemory) {
            this.inMemoryStore.delete(key);
            return;
        }
        await this.client.del(key);
    }
    async mget(keys) {
        if (this.useMemory) {
            return keys.map(key => {
                const entry = this.inMemoryStore.get(key);
                if (!entry)
                    return null;
                if (entry.expiresAt < Date.now()) {
                    this.inMemoryStore.delete(key);
                    return null;
                }
                return entry.value;
            });
        }
        return this.client.mget(...keys);
    }
    async mset(keyValues, ttlSeconds) {
        if (this.useMemory) {
            Object.entries(keyValues).forEach(([key, value]) => {
                this.inMemoryStore.set(key, {
                    value,
                    expiresAt: Date.now() + (ttlSeconds * 1000)
                });
            });
            return;
        }
        const pipeline = this.client.pipeline();
        Object.entries(keyValues).forEach(([key, value]) => {
            pipeline.set(key, value, 'EX', ttlSeconds);
        });
        await pipeline.exec();
    }
    async delPattern(pattern) {
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
        let cursor = '0';
        let deletedCount = 0;
        do {
            const [newCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;
            if (keys.length > 0) {
                deletedCount += await this.client.del(...keys);
            }
        } while (cursor !== '0');
        return deletedCount;
    }
    async exists(key) {
        if (this.useMemory) {
            const entry = this.inMemoryStore.get(key);
            if (!entry)
                return false;
            if (entry.expiresAt < Date.now()) {
                this.inMemoryStore.delete(key);
                return false;
            }
            return true;
        }
        return (await this.client.exists(key)) === 1;
    }
    isConnected() {
        return !this.useMemory && this.client?.status === 'ready';
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)()
], RedisService);
//# sourceMappingURL=redis.service.js.map