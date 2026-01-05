import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private client;
    onModuleInit(): void;
    onModuleDestroy(): void;
    setOtp(mobile: string, otp: string): Promise<void>;
    getOtp(mobile: string): Promise<string>;
    delOtp(mobile: string): Promise<void>;
}
