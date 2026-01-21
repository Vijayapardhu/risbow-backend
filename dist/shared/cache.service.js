"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("./redis.service");
const crypto = __importStar(require("crypto"));
let CacheService = CacheService_1 = class CacheService {
    constructor(redis) {
        this.redis = redis;
        this.logger = new common_1.Logger(CacheService_1.name);
        this.metrics = new Map();
        this.pendingPromises = new Map();
    }
    generateKey(prefix, params) {
        if (!params || Object.keys(params).length === 0) {
            return prefix;
        }
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
            acc[key] = params[key];
            return acc;
        }, {});
        const hash = crypto
            .createHash('md5')
            .update(JSON.stringify(sortedParams))
            .digest('hex')
            .substring(0, 8);
        return `${prefix}:${hash}`;
    }
    async get(key) {
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                this.recordHit(key);
                this.logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(cached);
            }
            this.recordMiss(key);
            this.logger.debug(`Cache MISS: ${key}`);
            return null;
        }
        catch (error) {
            this.logger.warn(`Cache get error for ${key}: ${error.message}`);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            const serialized = JSON.stringify(value);
            await this.redis.set(key, serialized, ttlSeconds);
            this.logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
        }
        catch (error) {
            this.logger.warn(`Cache set error for ${key}: ${error.message}`);
        }
    }
    async del(key) {
        try {
            await this.redis.del(key);
            this.logger.debug(`Cache DEL: ${key}`);
        }
        catch (error) {
            this.logger.warn(`Cache delete error for ${key}: ${error.message}`);
        }
    }
    async delPattern(pattern) {
        try {
            await this.redis.delPattern(pattern);
            this.logger.log(`Cache invalidated: ${pattern}`);
        }
        catch (error) {
            this.logger.warn(`Cache pattern delete error for ${pattern}: ${error.message}`);
        }
    }
    async getOrSet(key, ttlSeconds, fetchFn) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        if (this.pendingPromises.has(key)) {
            return this.pendingPromises.get(key);
        }
        const promise = (async () => {
            try {
                const value = await fetchFn();
                await this.set(key, value, ttlSeconds);
                return value;
            }
            catch (error) {
                throw error;
            }
            finally {
                this.pendingPromises.delete(key);
            }
        })();
        this.pendingPromises.set(key, promise);
        return promise;
    }
    getMetrics() {
        const result = {};
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
    resetMetrics() {
        this.metrics.clear();
    }
    recordHit(key) {
        const prefix = this.extractPrefix(key);
        const current = this.metrics.get(prefix) || { hits: 0, misses: 0 };
        current.hits++;
        this.metrics.set(prefix, current);
    }
    recordMiss(key) {
        const prefix = this.extractPrefix(key);
        const current = this.metrics.get(prefix) || { hits: 0, misses: 0 };
        current.misses++;
        this.metrics.set(prefix, current);
    }
    extractPrefix(key) {
        const match = key.match(/^([^:]+)/);
        return match ? match[1] : key;
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], CacheService);
//# sourceMappingURL=cache.service.js.map