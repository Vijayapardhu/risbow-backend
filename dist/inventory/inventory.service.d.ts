import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
export declare class InventoryService {
    private prisma;
    private redisService;
    private readonly logger;
    constructor(prisma: PrismaService, redisService: RedisService);
    private getReservationKey;
    getStock(productId: string, variationId?: string): Promise<{
        productId: string;
        variationId: string;
        sku: string;
        stock: number;
        reserved: number;
        available: number;
        status: string;
        isLowStock: boolean;
    }>;
    reserveStock(productId: string, quantity: number, variationId?: string): Promise<boolean>;
    releaseStock(productId: string, quantity: number, variationId?: string): Promise<void>;
    deductStock(productId: string, quantity: number, variationId?: string): Promise<void>;
    restoreStock(productId: string, quantity: number, variationId?: string): Promise<void>;
}
