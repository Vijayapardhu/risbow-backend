import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { UserProductEventType } from '@prisma/client';

@Injectable()
export class EcommerceEventsService {
  private readonly logger = new Logger(EcommerceEventsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private trendKey(type: UserProductEventType) {
    // Rolling leaderboard (best-effort). Consumers can interpret scores as "hotness".
    return `trend:product:${type.toLowerCase()}:global`;
  }

  async track(params: {
    userId?: string;
    sessionId?: string;
    type: UserProductEventType;
    source?: string;
    productId: string;
    variantId?: string;
    quantity?: number;
    price?: number; // paise
    metadata?: any;
  }) {
    try {
      await (this.prisma as any).userProductEvent.create({
        data: {
          userId: params.userId || null,
          sessionId: params.sessionId,
          type: params.type,
          source: params.source,
          productId: params.productId,
          variantId: params.variantId,
          quantity: params.quantity,
          price: params.price,
          metadata: params.metadata,
        },
      });

      // Update trending leaderboard in Redis
      const key = this.trendKey(params.type);
      await this.redis.zincrby(key, 1, params.productId);
      await this.redis.expire(key, 60 * 60 * 24 * 14); // 14 days rolling
    } catch (e: any) {
      this.logger.warn(`Failed to track event ${params.type} for product ${params.productId}: ${e.message}`);
    }
  }

  async getTrending(type: UserProductEventType, limit = 20): Promise<string[]> {
    const key = this.trendKey(type);
    const flat = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES').catch(() => []);
    // flat = [member, score, member, score...]
    const ids: string[] = [];
    for (let i = 0; i < flat.length; i += 2) ids.push(flat[i]);
    return ids;
  }
}

