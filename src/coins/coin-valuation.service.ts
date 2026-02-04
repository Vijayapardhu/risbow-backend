import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { PlatformConfigHelper } from '../common/platform-config.helper';

/**
 * CoinValuationService
 *
 * Single source of truth for Bow Coin -> INR valuation.
 *
 * Rules:
 * - Money is integer paise.
 * - Valuation is stored as integer paise per 1 coin.
 * - Changes are future-only via effective dating (close previous active row, create new row).
 */
@Injectable()
export class CoinValuationService {
  private readonly logger = new Logger(CoinValuationService.name);

  // Safe default: 1 coin = ₹1
  private readonly DEFAULT_PAISE_PER_COIN = 100;

  constructor(private prisma: PrismaService) {}

  async getActivePaisePerCoin(role: UserRole, at: Date = new Date()): Promise<number> {
    const row = await (this.prisma as any).coinValuation.findFirst({
      where: {
        role,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      select: { paisePerCoin: true },
    });

    if (!row?.paisePerCoin) {
      this.logger.warn(`No active coin valuation found for role ${role}. Falling back to default.`);
      return this.DEFAULT_PAISE_PER_COIN;
    }

    return row.paisePerCoin;
  }

  async getActiveValuations(at: Date = new Date()): Promise<Record<string, number>> {
    const roles = Object.values(UserRole);
    const entries = await Promise.all(roles.map((r) => this.getActivePaisePerCoin(r, at)));

    const map: Record<string, number> = {};
    for (let i = 0; i < roles.length; i++) {
      map[roles[i]] = entries[i];
    }
    return map;
  }

  /**
   * Sets a new valuation for a role (future-only).
   *
   * Idempotency:
   * - If the current active valuation already equals paisePerCoin, do nothing and return it.
   */
  async setValuation(params: {
    actorUserId: string;
    role: UserRole;
    paisePerCoin: number;
    effectiveFrom?: Date;
  }) {
    const { actorUserId, role, paisePerCoin } = params;
    const effectiveFrom = params.effectiveFrom ?? new Date();

    if (!Number.isInteger(paisePerCoin) || paisePerCoin < 1) {
      throw new BadRequestException('paisePerCoin must be an integer >= 1');
    }

    return this.prisma.$transaction(async (tx) => {
      const active = await (tx as any).coinValuation.findFirst({
        where: {
          role,
          effectiveFrom: { lte: effectiveFrom },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (active?.effectiveTo == null && active?.paisePerCoin === paisePerCoin) {
        return active;
      }

      // Close any currently active row for this role (effectiveTo IS NULL)
      await (tx as any).coinValuation.updateMany({
        where: { role, effectiveTo: null },
        data: { effectiveTo: effectiveFrom },
      });

      // Create new active valuation
      const created = await (tx as any).coinValuation.create({
        data: {
          role,
          paisePerCoin,
          effectiveFrom,
          effectiveTo: null,
          setByUserId: actorUserId,
        },
      });

      return created;
    });
  }

  /**
   * Get coins awarded per 5-star rating (configurable by admin)
   * Default: 2 coins
   */
  async getCoinsPerFiveStarRating(): Promise<number> {
    try {
      const config = await (this.prisma as any).platformConfig.findUnique({
        where: PlatformConfigHelper.buildWhereUnique('app', 'RATING_5_STAR_COINS'),
      });

      if (!config || !config.value) {
        return 2; // Default: 2 coins
      }

      const parsedValue = PlatformConfigHelper.parseJsonValue(config.value);
      const coins = typeof parsedValue === 'number' ? parsedValue : parseInt(parsedValue, 10);
      return Number.isNaN(coins) ? 2 : coins;
    } catch (error) {
      this.logger.warn('Failed to get rating coins config, using default: 2');
      return 2;
    }
  }

  /**
   * Set coins awarded per 5-star rating (configurable by admin)
   * Stores in PlatformConfig table
   */
  async setCoinsPerFiveStarRating(actorUserId: string, coins: number): Promise<any> {
    if (!Number.isInteger(coins) || coins < 0) {
      throw new BadRequestException('coins must be a non-negative integer');
    }

    return this.prisma.$transaction(async (tx) => {
      const config = await (tx as any).platformConfig.upsert({
        where: PlatformConfigHelper.buildWhereUnique('app', 'RATING_5_STAR_COINS'),
        create: {
          category: 'app',
          key: 'RATING_5_STAR_COINS',
          value: PlatformConfigHelper.serializeValue(coins),
          updatedById: actorUserId,
        },
        update: {
          value: PlatformConfigHelper.serializeValue(coins),
          updatedById: actorUserId,
        },
      });

      this.logger.log(`Admin ${actorUserId} set rating coins to ${coins}`);
      return config;
    });
  }
}

