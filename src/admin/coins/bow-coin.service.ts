import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AdminAuditService, AuditActionType, AuditResourceType } from '../audit/admin-audit.service';

/**
 * Coin transaction types
 */
export enum CoinTransactionType {
  // Earning types
  PURCHASE_REWARD = 'PURCHASE_REWARD',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  REVIEW_REWARD = 'REVIEW_REWARD',
  SIGNUP_BONUS = 'SIGNUP_BONUS',
  PROMOTIONAL = 'PROMOTIONAL',
  ADMIN_GRANT = 'ADMIN_GRANT',
  REFUND_CREDIT = 'REFUND_CREDIT',
  MILESTONE_BONUS = 'MILESTONE_BONUS',

  // Spending types
  ORDER_REDEMPTION = 'ORDER_REDEMPTION',
  ADMIN_REVOKE = 'ADMIN_REVOKE',
  EXPIRATION = 'EXPIRATION',
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * Default coin economy configuration
 */
const DEFAULT_COIN_CONFIG = {
  name: 'Bow Coins',
  valuePerCoin: 1, // 1 coin = ₹1
  earnRatePerRupee: 0.1, // Earn 0.1 coin per rupee spent
  minRedemption: 100, // Minimum 100 coins to redeem
  maxRedemptionPercent: 20, // Max 20% of order value
  expiryDays: 365, // Coins expire after 1 year
  signupBonus: 50,
  referralBonus: 100,
  reviewReward: 10,
  isActive: true,
};

interface GrantCoinsDto {
  userId: string;
  amount: number;
  reason: string;
  type?: CoinTransactionType;
  referenceId?: string;
  adminId: string;
  adminEmail?: string;
}

interface RevokeCoinsDto {
  userId: string;
  amount: number;
  reason: string;
  referenceId?: string;
  adminId: string;
  adminEmail?: string;
}

interface RedemptionParams {
  userId: string;
  orderId: string;
  amount: number;
  orderTotal: number;
}

@Injectable()
export class BowCoinService {
  constructor(
    private prisma: PrismaService,
    private auditService: AdminAuditService,
  ) {}

  /**
   * Get or create coin configuration
   * TODO: bowCoinConfig model doesn't exist - need to use PlatformConfig or create the model
   */
  async getConfig() {
    // Temporarily return default config until bowCoinConfig model is added
    return DEFAULT_COIN_CONFIG;
    /* 
    let config = await this.prisma.bowCoinConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!config) {
      config = await this.prisma.bowCoinConfig.create({
        data: DEFAULT_COIN_CONFIG,
      });
    }

    return config;
    */
  }

  /**
   * Update coin configuration
   * TODO: bowCoinConfig model doesn't exist - need to use PlatformConfig or create the model
   */
  async updateConfig(
    data: Partial<typeof DEFAULT_COIN_CONFIG>,
    adminId: string,
  ) {
    // Temporarily return default config until bowCoinConfig model is added
    return { ...DEFAULT_COIN_CONFIG, ...data };
    /*
    const currentConfig = await this.getConfig();

    const updatedConfig = await this.prisma.bowCoinConfig.update({
      where: { id: currentConfig.id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      adminId,
      action: AuditActionType.COIN_CONFIG_UPDATED,
      resourceType: AuditResourceType.COIN,
      resourceId: currentConfig.id,
      oldValues: currentConfig as any,
      newValues: updatedConfig as any,
    });

    return updatedConfig;
    */
  }

  /**
   * Get user coin balance
   */
  async getUserBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        coinsBalance: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.id,
      balance: user.coinsBalance || 0,
    };
  }

  /**
   * Get user transaction history
   */
  async getUserTransactions(
    userId: string,
    options?: {
      type?: CoinTransactionType;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const { type, startDate, endDate, page = 1, limit = 50 } = options || {};

    const where: Prisma.CoinTransactionWhereInput = { userId };

    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.coinTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.coinTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Grant coins to a user (admin action)
   */
  async grantCoins(dto: GrantCoinsDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const config = await this.getConfig();

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.expiryDays);

    // Create transaction and update balance in a transaction
    const [transaction] = await this.prisma.$transaction([
      this.prisma.coinTransaction.create({
        data: {
          userId: dto.userId,
          type: dto.type || CoinTransactionType.ADMIN_GRANT,
          amount: dto.amount,
          balanceBefore: user.coinsBalance || 0,
          balanceAfter: (user.coinsBalance || 0) + dto.amount,
          reason: dto.reason,
          referenceId: dto.referenceId,
          expiresAt,
          metadata: {
            grantedBy: dto.adminId,
            grantedByEmail: dto.adminEmail,
          },
        },
      }),
      this.prisma.user.update({
        where: { id: dto.userId },
        data: {
          coinsBalance: { increment: dto.amount },
        },
      }),
    ]);

    await this.auditService.log({
      adminId: dto.adminId,
      adminEmail: dto.adminEmail,
      action: AuditActionType.COIN_GRANTED,
      resourceType: AuditResourceType.COIN,
      resourceId: transaction.id,
      details: {
        userId: dto.userId,
        amount: dto.amount,
        reason: dto.reason,
        type: dto.type,
      },
    });

    return transaction;
  }

  /**
   * Revoke coins from a user (admin action)
   */
  async revokeCoins(dto: RevokeCoinsDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentBalance = user.coinsBalance || 0;
    if (dto.amount > currentBalance) {
      throw new BadRequestException(
        `Cannot revoke ${dto.amount} coins. User only has ${currentBalance} coins.`,
      );
    }

    // Create transaction and update balance
    const [transaction] = await this.prisma.$transaction([
      this.prisma.coinTransaction.create({
        data: {
          userId: dto.userId,
          type: CoinTransactionType.ADMIN_REVOKE,
          amount: -dto.amount,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - dto.amount,
          reason: dto.reason,
          referenceId: dto.referenceId,
          metadata: {
            revokedBy: dto.adminId,
            revokedByEmail: dto.adminEmail,
          },
        },
      }),
      this.prisma.user.update({
        where: { id: dto.userId },
        data: {
          coinsBalance: { decrement: dto.amount },
        },
      }),
    ]);

    await this.auditService.log({
      adminId: dto.adminId,
      adminEmail: dto.adminEmail,
      action: AuditActionType.COIN_REVOKED,
      resourceType: AuditResourceType.COIN,
      resourceId: transaction.id,
      details: {
        userId: dto.userId,
        amount: dto.amount,
        reason: dto.reason,
      },
    });

    return transaction;
  }

  /**
   * Process coin earning for a purchase
   */
  async earnFromPurchase(userId: string, orderId: string, orderAmount: number) {
    const config = await this.getConfig();

    if (!config.isActive) {
      return null; // Coin system disabled
    }

    const coinsEarned = Math.floor(orderAmount * config.earnRatePerRupee);

    if (coinsEarned <= 0) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.expiryDays);

    const [transaction] = await this.prisma.$transaction([
      this.prisma.coinTransaction.create({
        data: {
          userId,
          type: CoinTransactionType.PURCHASE_REWARD,
          amount: coinsEarned,
          balanceBefore: user.coinsBalance || 0,
          balanceAfter: (user.coinsBalance || 0) + coinsEarned,
          reason: `Earned from order`,
          referenceId: orderId,
          expiresAt,
          metadata: { orderAmount },
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          coinsBalance: { increment: coinsEarned },
        },
      }),
    ]);

    return transaction;
  }

  /**
   * Validate and calculate coin redemption
   */
  async validateRedemption(params: RedemptionParams) {
    const config = await this.getConfig();

    if (!config.isActive) {
      throw new BadRequestException('Coin redemption is currently disabled');
    }

    const { balance } = await this.getUserBalance(params.userId);

    // Check minimum redemption
    if (params.amount < config.minRedemption) {
      throw new BadRequestException(
        `Minimum redemption is ${config.minRedemption} coins`,
      );
    }

    // Check user has enough coins
    if (params.amount > balance) {
      throw new BadRequestException(
        `Insufficient coins. You have ${balance} coins.`,
      );
    }

    // Calculate max redeemable amount
    const maxRedeemableValue = Math.floor(
      (params.orderTotal * config.maxRedemptionPercent) / 100,
    );
    const maxRedeemableCoins = Math.floor(maxRedeemableValue / config.valuePerCoin);

    if (params.amount > maxRedeemableCoins) {
      throw new BadRequestException(
        `Maximum redeemable coins for this order is ${maxRedeemableCoins} (${config.maxRedemptionPercent}% of order value)`,
      );
    }

    // Calculate discount value
    const discountValue = params.amount * config.valuePerCoin;

    return {
      valid: true,
      coinsToRedeem: params.amount,
      discountValue,
      remainingBalance: balance - params.amount,
    };
  }

  /**
   * Process coin redemption for an order
   */
  async redeemForOrder(params: RedemptionParams) {
    // Validate first
    const validation = await this.validateRedemption(params);
    const { balance } = await this.getUserBalance(params.userId);

    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create redemption transaction
    const [transaction] = await this.prisma.$transaction([
      this.prisma.coinTransaction.create({
        data: {
          userId: params.userId,
          type: CoinTransactionType.ORDER_REDEMPTION,
          amount: -params.amount,
          balanceBefore: balance,
          balanceAfter: validation.remainingBalance,
          reason: `Redeemed for order`,
          referenceId: params.orderId,
          metadata: {
            discountValue: validation.discountValue,
            orderTotal: params.orderTotal,
          },
        },
      }),
      this.prisma.user.update({
        where: { id: params.userId },
        data: {
          coinsBalance: { decrement: params.amount },
        },
      }),
    ]);

    return {
      transaction,
      discountValue: validation.discountValue,
    };
  }

  /**
   * Process signup bonus
   */
  async grantSignupBonus(userId: string) {
    const config = await this.getConfig();

    if (!config.isActive || config.signupBonus <= 0) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.expiryDays);

    const [transaction] = await this.prisma.$transaction([
      this.prisma.coinTransaction.create({
        data: {
          userId,
          type: CoinTransactionType.SIGNUP_BONUS,
          amount: config.signupBonus,
          balanceBefore: user.coinsBalance || 0,
          balanceAfter: (user.coinsBalance || 0) + config.signupBonus,
          reason: 'Welcome bonus for signing up',
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          coinsBalance: { increment: config.signupBonus },
        },
      }),
    ]);

    return transaction;
  }

  /**
   * Process referral bonus
   */
  async grantReferralBonus(referrerId: string, referredUserId: string) {
    const config = await this.getConfig();

    if (!config.isActive || config.referralBonus <= 0) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: referrerId },
    });

    if (!user) {
      return null;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.expiryDays);

    const [transaction] = await this.prisma.$transaction([
      this.prisma.coinTransaction.create({
        data: {
          userId: referrerId,
          type: CoinTransactionType.REFERRAL_BONUS,
          amount: config.referralBonus,
          balanceBefore: user.coinsBalance || 0,
          balanceAfter: (user.coinsBalance || 0) + config.referralBonus,
          reason: 'Referral bonus',
          referenceId: referredUserId,
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: referrerId },
        data: {
          coinsBalance: { increment: config.referralBonus },
        },
      }),
    ]);

    return transaction;
  }

  /**
   * Process expired coins (batch job)
   */
  async processExpiredCoins() {
    const expiredTransactions = await this.prisma.coinTransaction.findMany({
      where: {
        expiresAt: { lte: new Date() },
        amount: { gt: 0 },
        // isExpired field doesn't exist in schema - expiry is determined by expiresAt
      },
    });

    let processedCount = 0;

    for (const tx of expiredTransactions) {
      // Calculate remaining value from this transaction
      // This is a simplified version - a real implementation would track
      // FIFO consumption of coins
      // Note: isExpired field doesn't exist in schema
      // Expiry is determined by expiresAt < current date
      // await this.prisma.coinTransaction.update({
      //   where: { id: tx.id },
      //   data: { isExpired: true },
      // });

      processedCount++;
    }

    return { processedCount };
  }

  /**
   * Get coin analytics
   */
  async getAnalytics(startDate: Date, endDate: Date) {
    const transactions = await this.prisma.coinTransaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const stats = {
      totalEarned: 0,
      totalRedeemed: 0,
      totalRevoked: 0,
      totalExpired: 0,
      byType: {} as Record<string, { count: number; amount: number }>,
    };

    for (const tx of transactions) {
      if (tx.amount > 0) {
        stats.totalEarned += tx.amount;
      } else {
        if (tx.type === CoinTransactionType.ORDER_REDEMPTION) {
          stats.totalRedeemed += Math.abs(tx.amount);
        } else if (tx.type === CoinTransactionType.ADMIN_REVOKE) {
          stats.totalRevoked += Math.abs(tx.amount);
        } else if (tx.type === CoinTransactionType.EXPIRATION) {
          stats.totalExpired += Math.abs(tx.amount);
        }
      }

      if (!stats.byType[tx.type]) {
        stats.byType[tx.type] = { count: 0, amount: 0 };
      }
      stats.byType[tx.type].count++;
      stats.byType[tx.type].amount += tx.amount;
    }

    return stats;
  }

  /**
   * Bulk grant coins to multiple users
   */
  async bulkGrant(
    userIds: string[],
    amount: number,
    reason: string,
    type: CoinTransactionType,
    adminId: string,
    adminEmail?: string,
  ) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { userId: string; error: string }[],
    };

    for (const userId of userIds) {
      try {
        await this.grantCoins({
          userId,
          amount,
          reason,
          type,
          adminId,
          adminEmail,
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }
}

