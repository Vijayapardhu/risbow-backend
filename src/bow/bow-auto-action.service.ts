import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { CartService } from '../cart/cart.service';

// Temporary enum until Prisma client is fixed
enum BowActionType {
  ADD_TO_CART = 'ADD_TO_CART',
  REMOVE_FROM_CART = 'REMOVE_FROM_CART',
  UPDATE_QUANTITY = 'UPDATE_QUANTITY',
  APPLY_COUPON = 'APPLY_COUPON',
  SELECT_GIFT = 'SELECT_GIFT',
  NAVIGATE = 'NAVIGATE',
  VIEW_CART = 'VIEW_CART',
  GET_RECOMMENDATIONS = 'GET_RECOMMENDATIONS',
  CLIENT_CONTROL = 'CLIENT_CONTROL',
  ROOM_NUDGE = 'ROOM_NUDGE',
  SUGGEST_BUNDLE = 'SUGGEST_BUNDLE',
  SUGGEST_GIFT = 'SUGGEST_GIFT',
  SUGGEST_UPSELL = 'SUGGEST_UPSELL',
  REMOVE_SUGGESTION = 'REMOVE_SUGGESTION'
}

interface AutoActionRequest {
  actionType: BowActionType;
  userId: string;
  productId?: string;
  price?: number;
  quantity?: number;
  reason: string;
  strategy?: string;
}

interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  cooldownRemaining?: number;
}

@Injectable()
export class BowAutoActionService {
  private readonly logger = new Logger(BowAutoActionService.name);

  // Guardrail configurations
  private readonly MAX_AUTO_ADD_PRICE = 499;
  private readonly ACTION_COOLDOWN_MINUTES = 1440; // 24 hours
  private readonly USER_DAILY_AUTO_ACTION_LIMIT = 3;
  private readonly RESTRICTED_CATEGORIES = ['adult', 'alcohol', 'tobacco'];

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private cartService: CartService,
  ) {}

  /**
   * Execute automatic Bow action with comprehensive guardrails
   */
  async executeAutoAction(request: AutoActionRequest): Promise<{
    success: boolean;
    message: string;
    actionId?: string;
    canUndo?: boolean;
  }> {
    const { actionType, userId, productId, price, quantity, reason } = request;

    // 1. Comprehensive guardrail validation
    const guardrailCheck = await this.validateGuardrails(request);
    if (!guardrailCheck.allowed) {
      this.logger.warn(`Auto-action ${actionType} blocked for user ${userId}: ${guardrailCheck.reason}`);
      return {
        success: false,
        message: guardrailCheck.reason || 'Action not allowed by safety rules'
      };
    }

    // 2. Execute the action
    try {
      const result = await this.performAutoAction(request);

      // 3. Log the action for audit and analytics
      const actionLog = await this.logAutoAction(request, result);

      return {
        success: true,
        message: result.message,
        actionId: actionLog.id,
        canUndo: this.isActionReversible(actionType)
      };
    } catch (error) {
      this.logger.error(`Auto-action execution failed: ${error.message}`, error.stack);

      // Log failed action
      await this.logFailedAutoAction(request, error.message);

      return {
        success: false,
        message: 'Auto-action failed due to system error'
      };
    }
  }

  /**
   * Comprehensive guardrail validation system
   */
  private async validateGuardrails(request: AutoActionRequest): Promise<GuardrailResult> {
    const { actionType, userId, productId, price, quantity } = request;

    // 1. Price limit for auto-add actions
    if (actionType === BowActionType.ADD_TO_CART && price && price > this.MAX_AUTO_ADD_PRICE) {
      return {
        allowed: false,
        reason: `Auto-add not allowed for items over ₹${this.MAX_AUTO_ADD_PRICE}`
      };
    }

    // 2. Stock and product validation
    if (productId) {
      const productCheck = await this.validateProduct(productId, quantity || 1);
      if (!productCheck.allowed) return productCheck;
    }

    // 3. Action cooldown validation
    const cooldownCheck = await this.checkActionCooldown(userId, actionType, productId);
    if (!cooldownCheck.allowed) return cooldownCheck;

    // 4. Daily auto-action limit
    const dailyLimitCheck = await this.checkDailyAutoActionLimit(userId);
    if (!dailyLimitCheck.allowed) return dailyLimitCheck;

    // 5. Category restrictions
    if (productId) {
      const categoryCheck = await this.checkCategoryRestrictions(productId);
      if (!categoryCheck.allowed) return categoryCheck;
    }

    // 6. User behavior and preference validation
    const behaviorCheck = await this.validateUserBehavior(userId, request);
    if (!behaviorCheck.allowed) return behaviorCheck;

    return { allowed: true };
  }

  /**
   * Validate product availability and restrictions
   */
  private async validateProduct(productId: string, quantity: number): Promise<GuardrailResult> {
    const product = await (this.prisma as any).product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product) {
      return { allowed: false, reason: 'Product not found' };
    }

    if (!product.isActive) {
      return { allowed: false, reason: 'Product is not available' };
    }

    if (product.stock < quantity) {
      return { allowed: false, reason: `Insufficient stock (${product.stock} available)` };
    }

    return { allowed: true };
  }

  /**
   * Check action cooldown to prevent spam
   */
  private async checkActionCooldown(userId: string, actionType: BowActionType, productId?: string): Promise<GuardrailResult> {
    const cooldownKey = `bow:auto:cooldown:${userId}:${actionType}${productId ? `:${productId}` : ''}`;
    const lastActionTime = await this.redis.get(cooldownKey);

    if (lastActionTime) {
      const timeSinceLastAction = Date.now() - parseInt(lastActionTime);
      const cooldownMs = this.ACTION_COOLDOWN_MINUTES * 60 * 1000;

      if (timeSinceLastAction < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastAction) / (60 * 1000));
        return {
          allowed: false,
          reason: `Auto-action cooldown active. Next action available in ${remainingMinutes} minutes`,
          cooldownRemaining: remainingMinutes
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check daily auto-action limit per user
   */
  private async checkDailyAutoActionLimit(userId: string): Promise<GuardrailResult> {
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `bow:auto:daily:${userId}:${today}`;

    const currentCount = parseInt(await this.redis.get(dailyKey) || '0');

    if (currentCount >= this.USER_DAILY_AUTO_ACTION_LIMIT) {
      return {
        allowed: false,
        reason: `Daily auto-action limit (${this.USER_DAILY_AUTO_ACTION_LIMIT}) reached`
      };
    }

    return { allowed: true };
  }

  /**
   * Check category-based restrictions
   */
  private async checkCategoryRestrictions(productId: string): Promise<GuardrailResult> {
    const product = await (this.prisma as any).product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product?.category) {
      return { allowed: false, reason: 'Product category information unavailable' };
    }

    const categoryName = product.category.name.toLowerCase();
    if (this.RESTRICTED_CATEGORIES.includes(categoryName)) {
      return { allowed: false, reason: `Auto-actions not allowed for ${categoryName} category` };
    }

    return { allowed: true };
  }

  /**
   * Validate user behavior patterns
   */
  private async validateUserBehavior(userId: string, request: AutoActionRequest): Promise<GuardrailResult> {
    const { actionType, productId } = request;

    // Check if user has recently rejected similar auto-actions
    if (productId) {
      const recentRejections = await (this.prisma as any).bowActionLog.findMany({
        where: {
          userId,
          actionType: BowActionType.REMOVE_SUGGESTION,
          productId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      });

      if (recentRejections.length > 0) {
        return { allowed: false, reason: 'User recently rejected similar suggestion' };
      }
    }

    // Check user preference profile
    const profile = await (this.prisma as any).userPreferenceProfile.findUnique({
      where: { userId }
    });

    if (profile && productId) {
      const product = await (this.prisma as any).product.findUnique({
        where: { id: productId },
        include: { category: true }
      });

      if (product?.category) {
        const categoryName = product.category.name.toLowerCase();
        const preferredCategories = profile.preferredCategories?.map((c: string) => c.toLowerCase()) || [];

        if (preferredCategories.length > 0 && !preferredCategories.includes(categoryName)) {
          // Allow but with lower confidence - this could be used for A/B testing
          this.logger.debug(`Auto-action for non-preferred category ${categoryName} for user ${userId}`);
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Perform the actual auto-action
   */
  private async performAutoAction(request: AutoActionRequest): Promise<{ message: string; data?: any }> {
    const { actionType, userId, productId, quantity } = request;

    switch (actionType) {
      case BowActionType.ADD_TO_CART:
        if (!productId) throw new BadRequestException('Product ID required for cart addition');

        const cartResult = await this.cartService.addItem(userId, {
          productId,
          quantity: quantity || 1
        });

        return {
          message: `Added item to cart to help you reach your goal 🎯`,
          data: cartResult
        };

      case BowActionType.SUGGEST_BUNDLE:
        // Create bundle suggestion (frontend will display)
        return {
          message: 'Bundle suggestion ready - complete your purchase!'
        };

      case BowActionType.SUGGEST_GIFT:
        return {
          message: 'Gift suggestion available - unlock free shipping!'
        };

      case BowActionType.SUGGEST_UPSELL:
        return {
          message: 'Premium upgrade available for better value'
        };

      default:
        throw new BadRequestException(`Auto-action ${actionType} not supported`);
    }
  }

  /**
   * Log successful auto-action
   */
  private async logAutoAction(request: AutoActionRequest, result: any) {
    const { actionType, userId, productId, price, quantity, reason, strategy } = request;

    return await (this.prisma as any).bowActionLog.create({
      data: {
        userId,
        actionType,
        productId,
        quantity,
        price,
        reason,
        guardrailCheck: {
          priceLimit: price ? price <= this.MAX_AUTO_ADD_PRICE : true,
          stockVerified: true,
          cooldownChecked: true,
          dailyLimitChecked: true
        }
      }
    });
  }

  /**
   * Log failed auto-action
   */
  private async logFailedAutoAction(request: AutoActionRequest, errorMessage: string) {
    const { actionType, userId, productId, price, quantity, reason } = request;

    await (this.prisma as any).bowActionLog.create({
      data: {
        userId,
        actionType,
        productId,
        quantity,
        price,
        reason,
        autoReversed: true,
        reverseReason: `Failed: ${errorMessage}`
      }
    });
  }

  /**
   * Check if action can be reversed by user
   */
  private isActionReversible(actionType: BowActionType): boolean {
    return [
      BowActionType.ADD_TO_CART,
      BowActionType.SUGGEST_BUNDLE,
      BowActionType.SUGGEST_GIFT,
      BowActionType.SUGGEST_UPSELL
    ].includes(actionType);
  }

  /**
   * Manually reverse an auto-action (user-initiated)
   */
  async reverseAutoAction(userId: string, actionId: string): Promise<{ success: boolean; message: string }> {
    const actionLog = await (this.prisma as any).bowActionLog.findUnique({
      where: { id: actionId, userId }
    });

    if (!actionLog) {
      throw new BadRequestException('Auto-action not found');
    }

    if (actionLog.autoReversed) {
      return { success: false, message: 'Action already reversed' };
    }

    // Mark as reversed
    await (this.prisma as any).bowActionLog.update({
      where: { id: actionId },
      data: {
        autoReversed: true,
        reverseReason: 'User manually reversed auto-action',
        reversedAt: new Date()
      }
    });

    // Handle specific reversal logic
    if (actionLog.actionType === BowActionType.ADD_TO_CART && actionLog.productId) {
      // Find and remove the auto-added item from cart
      try {
        const cart = await this.cartService.getCart(userId);
        const itemToRemove = cart.items.find(item =>
          item.productId === actionLog.productId &&
          item.quantity === actionLog.quantity
        );

        if (itemToRemove) {
          await this.cartService.removeItem(userId, itemToRemove.id);
          return { success: true, message: 'Auto-added item removed from cart' };
        }
      } catch (error) {
        this.logger.error(`Failed to remove auto-added item: ${error.message}`);
      }
    }

    return { success: true, message: 'Auto-action reversed' };
  }

  /**
   * Update cooldown and daily limits after successful action
   */
  private async updateGuardrailTracking(request: AutoActionRequest) {
    const { userId, actionType, productId } = request;

    // Set cooldown
    const cooldownKey = `bow:auto:cooldown:${userId}:${actionType}${productId ? `:${productId}` : ''}`;
    await this.redis.set(cooldownKey, Date.now().toString(), this.ACTION_COOLDOWN_MINUTES * 60);

    // Update daily count
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `bow:auto:daily:${userId}:${today}`;
    const currentCount = parseInt(await this.redis.get(dailyKey) || '0');
    await this.redis.set(dailyKey, (currentCount + 1).toString(), 24 * 60 * 60);
  }

  /**
   * Get auto-action analytics for admin dashboard
   */
  async getAutoActionAnalytics(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [
      totalActions,
      actionsByType,
      reversalStats,
      revenueAttribution
    ] = await Promise.all([
      (this.prisma as any).bowActionLog.count({ where: whereClause }),
      (this.prisma as any).bowActionLog.groupBy({
        by: ['actionType'],
        where: whereClause,
        _count: { id: true },
        _sum: { attributedRevenue: true }
      }),
      (this.prisma as any).bowActionLog.aggregate({
        where: { ...whereClause, autoReversed: true },
        _count: { id: true }
      }),
      (this.prisma as any).bowActionLog.aggregate({
        where: { ...whereClause, attributedRevenue: { not: null } },
        _sum: { attributedRevenue: true },
        _count: { id: true }
      })
    ]);

    return {
      totalActions,
      actionsByType,
      reversalRate: reversalStats._count.id / totalActions,
      totalRevenueAttributed: revenueAttribution._sum.attributedRevenue || 0,
      conversionActions: revenueAttribution._count.id
    };
  }
}