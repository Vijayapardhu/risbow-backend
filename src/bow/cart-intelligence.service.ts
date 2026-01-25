import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { CartInsightType, InsightSeverity } from '@prisma/client';

export interface CartSignal {
  type: CartInsightType;
  severity: InsightSeverity;
  reason: string;
  metadata?: any;
}

interface ThresholdCheck {
  threshold: number;
  currentValue: number;
  difference: number;
  eligible: boolean;
}

@Injectable()
export class CartIntelligenceService {
  private readonly logger = new Logger(CartIntelligenceService.name);

  // Configurable thresholds
  // Money is always paise
  private readonly FREE_SHIPPING_THRESHOLD = 100000; // ₹1000
  private readonly GIFT_ELIGIBILITY_THRESHOLD = 200000; // ₹2000
  private readonly ROOM_UNLOCK_MIN_ORDERS = 3;
  private readonly ROOM_UNLOCK_MIN_VALUE = 150000; // ₹1500
  private readonly THRESHOLD_NEAR_WINDOW_PAISE = 30000; // ₹300
  private readonly THRESHOLD_NEAR_HIGH_PAISE = 10000; // ₹100

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Analyze cart in real-time for behavioral patterns and opportunities
   */
  async analyzeCart(userId: string): Promise<CartSignal[]> {
    const cart = await (this.prisma as any).cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { category: true }
            }
          }
        }
      }
    });

    if (!cart || !cart.items.length) {
      return [];
    }

    const signals: CartSignal[] = [];
    const cartValue = this.calculateCartValue(cart);
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const categories = [...new Set(cart.items.map(item => item.product.categoryId))];

    // 1. Hesitation Detection
    const hesitationSignals = await this.detectHesitation(userId, cart);
    signals.push(...hesitationSignals);

    // 2. Threshold Near Detection
    const thresholdSignals = this.detectThresholdNear(cartValue);
    signals.push(...thresholdSignals);

    // 3. Bundle Opportunities
    if (itemCount === 1) {
      signals.push({
        type: CartInsightType.BUNDLE_OPPORTUNITY,
        severity: InsightSeverity.MEDIUM,
        reason: 'Single item cart - bundle opportunity',
        metadata: { itemCount, categories }
      });
    }

    // 4. Price Sensitivity
    const priceSignals = await this.detectPriceSensitivity(userId, cart);
    signals.push(...priceSignals);

    // 5. Repeat Removal Detection
    const removalSignals = await this.detectRepeatRemovals(userId, cart);
    signals.push(...removalSignals);

    // 6. Gift Eligibility
    if (cartValue >= this.GIFT_ELIGIBILITY_THRESHOLD - this.THRESHOLD_NEAR_WINDOW_PAISE) {
      signals.push({
        type: CartInsightType.GIFT_ELIGIBLE,
        severity: cartValue >= this.GIFT_ELIGIBILITY_THRESHOLD ? InsightSeverity.HIGH : InsightSeverity.MEDIUM,
        reason: `Cart value ₹${cartValue} - gift eligible at ₹${this.GIFT_ELIGIBILITY_THRESHOLD}`,
        metadata: { cartValue, threshold: this.GIFT_ELIGIBILITY_THRESHOLD }
      });
    }

    // 7. Room Unlock Potential
    const roomSignals = await this.detectRoomUnlockPotential(userId, cartValue, itemCount);
    signals.push(...roomSignals);

    return signals;
  }

  /**
   * Detect user hesitation patterns
   */
  private async detectHesitation(userId: string, cart: any): Promise<CartSignal[]> {
    const signals: CartSignal[] = [];

    // Check idle time since last cart activity
    const lastActivity = await (this.prisma as any).cartInsight.findFirst({
      where: { userId },
      orderBy: { triggeredAt: 'desc' }
    });

    if (lastActivity) {
      const idleMinutes = (Date.now() - lastActivity.triggeredAt.getTime()) / (1000 * 60);

      if (idleMinutes > 10) {
        const severity = idleMinutes > 30 ? InsightSeverity.HIGH :
                        idleMinutes > 20 ? InsightSeverity.MEDIUM : InsightSeverity.LOW;

        signals.push({
          type: CartInsightType.HESITATION,
          severity,
          reason: `Cart idle for ${Math.round(idleMinutes)} minutes`,
          metadata: { idleMinutes }
        });
      }
    }

    return signals;
  }

  /**
   * Detect when cart is near important thresholds
   */
  private detectThresholdNear(cartValue: number): CartSignal[] {
    const signals: CartSignal[] = [];
    const thresholds = [
      { name: 'free_shipping', value: this.FREE_SHIPPING_THRESHOLD },
      { name: 'gift_eligibility', value: this.GIFT_ELIGIBILITY_THRESHOLD }
    ];

    for (const threshold of thresholds) {
      const difference = threshold.value - cartValue;
      if (difference > 0 && difference <= this.THRESHOLD_NEAR_WINDOW_PAISE) { // Within ₹300
        const severity = difference <= this.THRESHOLD_NEAR_HIGH_PAISE ? InsightSeverity.HIGH : InsightSeverity.MEDIUM;

        signals.push({
          type: CartInsightType.THRESHOLD_NEAR,
          severity,
          reason: `₹${difference} away from ${threshold.name.replace('_', ' ')}`,
          metadata: { threshold: threshold.value, difference, thresholdType: threshold.name }
        });
      }
    }

    return signals;
  }

  /**
   * Detect price sensitivity through cart behavior
   */
  private async detectPriceSensitivity(userId: string, cart: any): Promise<CartSignal[]> {
    const signals: CartSignal[] = [];

    // Check if user frequently removes expensive items
    let recentRemovals: any[] = [];
    try {
      recentRemovals = await (this.prisma as any).bowActionLog.findMany({
        where: {
          userId,
          actionType: 'REMOVE_FROM_CART',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        },
        include: { product: true }
      });
    } catch {
      recentRemovals = [];
    }
    if (!Array.isArray(recentRemovals)) recentRemovals = [];

    if (recentRemovals.length >= 2) {
      const avgPrice = recentRemovals.reduce((sum, log) => sum + (log.price || 0), 0) / recentRemovals.length;
      const cartAvgPrice = cart.items.reduce((sum, item) =>
        sum + (item.product.offerPrice || item.product.price) * item.quantity, 0) / cart.items.length;

      if (avgPrice > cartAvgPrice * 1.5) {
        signals.push({
          type: CartInsightType.PRICE_SENSITIVITY,
          severity: InsightSeverity.MEDIUM,
          reason: 'User shows price sensitivity - recently removed expensive items',
          metadata: { recentRemovalAvgPrice: avgPrice, cartAvgPrice }
        });
      }
    }

    return signals;
  }

  /**
   * Detect repeat item removals
   */
  private async detectRepeatRemovals(userId: string, cart: any): Promise<CartSignal[]> {
    const signals: CartSignal[] = [];

    // Check for items removed 2+ times
    let recentLogs: any[] = [];
    try {
      recentLogs = await (this.prisma as any).bowActionLog.findMany({
        where: {
          userId,
          actionType: 'REMOVE_FROM_CART',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      });
    } catch {
      recentLogs = [];
    }
    if (!Array.isArray(recentLogs)) recentLogs = [];

    const removalCount = {};
    recentLogs.forEach(log => {
      if (log.productId) {
        removalCount[log.productId] = (removalCount[log.productId] || 0) + 1;
      }
    });

    for (const [productId, count] of Object.entries(removalCount)) {
      if ((count as number) >= 2) {
        const productInCart = cart.items.find(item => item.productId === productId);
        if (productInCart) {
          signals.push({
            type: CartInsightType.REPEAT_REMOVAL,
            severity: InsightSeverity.HIGH,
            reason: `Product removed ${count} times recently - high hesitation`,
            metadata: { productId, removalCount: count }
          });
        }
      }
    }

    return signals;
  }

  /**
   * Detect room unlock opportunities
   */
  private async detectRoomUnlockPotential(userId: string, cartValue: number, itemCount: number): Promise<CartSignal[]> {
    const signals: CartSignal[] = [];

    // Check active rooms near unlock thresholds
    let activeRooms: any[] = [];
    try {
      activeRooms = await (this.prisma as any).room.findMany({
        where: {
          status: 'LOCKED',
          endAt: { gt: new Date() },
          OR: [
            { unlockMinOrders: { lte: itemCount + 1 } },
            { unlockMinValue: { lte: cartValue + 500 } }
          ]
        }
      });
    } catch {
      activeRooms = [];
    }
    if (!Array.isArray(activeRooms)) activeRooms = [];

    for (const room of activeRooms) {
      let reason = '';
      let severity: InsightSeverity = InsightSeverity.LOW;

      if (room.unlockMinOrders && itemCount < room.unlockMinOrders) {
        const needed = room.unlockMinOrders - itemCount;
        reason = `Add ${needed} more items to unlock "${room.name}" room`;
        severity = needed === 1 ? InsightSeverity.HIGH : InsightSeverity.MEDIUM;
      } else if (room.unlockMinValue && cartValue < room.unlockMinValue) {
        const needed = room.unlockMinValue - cartValue;
        reason = `Add ₹${needed} more to unlock "${room.name}" room`;
        severity = needed <= 300 ? InsightSeverity.HIGH : InsightSeverity.MEDIUM;
      }

      if (reason) {
        signals.push({
          type: CartInsightType.THRESHOLD_NEAR,
          severity,
          reason,
          metadata: {
            roomId: room.id,
            roomName: room.name,
            unlockMinOrders: room.unlockMinOrders,
            unlockMinValue: room.unlockMinValue,
            currentValue: cartValue,
            currentItems: itemCount
          }
        });
      }
    }

    return signals;
  }

  /**
   * Calculate total cart value
   */
  private calculateCartValue(cart: any): number {
    return cart.items.reduce((total, item) => {
      const price = item.product.offerPrice || item.product.price;
      return total + (price * item.quantity);
    }, 0);
  }

  /**
   * Process signals into actionable insights (async via BullMQ)
   */
  async processSignals(userId: string, signals: CartSignal[]): Promise<void> {
    for (const signal of signals) {
      // Create cart insight record
      await (this.prisma as any).cartInsight.create({
        data: {
          userId,
          cartValue: 0, // Will be updated by cart service
          itemCount: 0,
          categories: [],
          cartPattern: 'NORMAL',
          hesitationScore: 0,
          abandonRisk: 0,
          type: signal.type,
          severity: signal.severity
        }
      });

      // Cache signal for quick access
      const cacheKey = `cart:signals:${userId}`;
      await this.redis.set(cacheKey, JSON.stringify(signals), 300); // 5 min cache
    }
  }

  /**
   * Get cached signals for user
   */
  async getCachedSignals(userId: string): Promise<CartSignal[]> {
    const cacheKey = `cart:signals:${userId}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }
}