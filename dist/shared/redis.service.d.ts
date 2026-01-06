import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private client?;
    private readonly logger;
    private inMemoryStore;
    private useMemory;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    setOtp(mobile: string, otp: string): Promise<void>;
    getOtp(mobile: string): Promise<string | null>;
    delOtp(mobile: string): Promise<void>;
}
