import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';

interface CartSnapshot {
  userId: string;
  cartValue: number;
  itemCount: number;
  categories: string[];
  lastModified: Date;
}

interface StrategyResult {
  strategy: string;
  message: string;
  products: Array<{
    id: string;
    title: string;
    price: number;
    reason: string;
  }>;
  expectedUplift: number;
  confidence: number;
}

interface ThresholdPushStrategy extends StrategyResult {
  threshold: number;
  currentValue: number;
  difference: number;
}

interface BundleStrategy extends StrategyResult {
  bundleItems: string[];
  discountPercent?: number;
}

interface ComplementaryStrategy extends StrategyResult {
  baseCategory: string;
  complementaryCategory: string;
}

@Injectable()
export class RecommendationStrategyService {
  private readonly logger = new Logger(RecommendationStrategyService.name);

  // Strategy configurations
  // Money is always paise
  private readonly FREE_SHIPPING_THRESHOLD = 100000; // ₹1000
  private readonly GIFT_ELIGIBILITY_THRESHOLD = 200000; // ₹2000
  private readonly MIN_BUNDLE_DISCOUNT = 5; // 5% minimum
  private readonly MAX_BUNDLE_SIZE = 3;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Main entry point: Get strategic recommendations for cart optimization
   */
  async getStrategicRecommendations(userId: string, cartSnapshot: CartSnapshot): Promise<StrategyResult[]> {
    const strategies: StrategyResult[] = [];

    // 1. Threshold Push Strategy
    const thresholdStrategies = await this.applyThresholdPushStrategy(cartSnapshot);
    strategies.push(...thresholdStrategies);

    // 2. Bundle Discount Strategy
    const bundleStrategies = await this.applyBundleStrategy(cartSnapshot);
    strategies.push(...bundleStrategies);

    // 3. Complete the Look Strategy
    const completeLookStrategies = await this.applyCompleteTheLookStrategy(cartSnapshot);
    strategies.push(...completeLookStrategies);

    // 4. Risk Reassurance Strategy (for high-value carts)
    if (cartSnapshot.cartValue > 3000) {
      const reassuranceStrategies = await this.applyRiskReassuranceStrategy(cartSnapshot);
      strategies.push(...reassuranceStrategies);
    }

    // 5. Scarcity Strategy (limited stock items)
    const scarcityStrategies = await this.applyScarcityStrategy(cartSnapshot);
    strategies.push(...scarcityStrategies);

    // 6. Social Proof Strategy
    const socialProofStrategies = await this.applySocialProofStrategy(cartSnapshot);
    strategies.push(...socialProofStrategies);

    // Rank and filter strategies
    return this.rankAndFilterStrategies(strategies, cartSnapshot);
  }

  /**
   * THRESHOLD_PUSH: Push users across purchase thresholds
   */
  private async applyThresholdPushStrategy(cartSnapshot: CartSnapshot): Promise<ThresholdPushStrategy[]> {
    const strategies: ThresholdPushStrategy[] = [];
    const { cartValue } = cartSnapshot;

    // Free Shipping Threshold
    const shippingDiff = this.FREE_SHIPPING_THRESHOLD - cartValue;
    if (shippingDiff > 0 && shippingDiff <= 300) {
      const suggestedProducts = await this.findProductsForThreshold(shippingDiff, cartSnapshot.categories);

      if (suggestedProducts.length > 0) {
        strategies.push({
          strategy: 'THRESHOLD_PUSH',
          message: `Add ₹${Math.ceil(shippingDiff / 100)} more to get FREE shipping! 🚚`,
          products: suggestedProducts,
          expectedUplift: shippingDiff,
          confidence: shippingDiff <= 100 ? 0.9 : shippingDiff <= 200 ? 0.7 : 0.5,
          threshold: this.FREE_SHIPPING_THRESHOLD,
          currentValue: cartValue,
          difference: shippingDiff
        });
      }
    }

    // Gift Eligibility Threshold
    const giftDiff = this.GIFT_ELIGIBILITY_THRESHOLD - cartValue;
    if (giftDiff > 0 && giftDiff <= 400) {
      const giftProducts = await this.findGiftProductsForThreshold(giftDiff);

      if (giftProducts.length > 0) {
        strategies.push({
          strategy: 'THRESHOLD_PUSH',
          message: `Add ₹${Math.ceil(giftDiff / 100)} more to unlock a FREE gift! 🎁`,
          products: giftProducts,
          expectedUplift: giftDiff,
          confidence: giftDiff <= 200 ? 0.8 : 0.6,
          threshold: this.GIFT_ELIGIBILITY_THRESHOLD,
          currentValue: cartValue,
          difference: giftDiff
        });
      }
    }

    // Room Unlock Thresholds
    const roomStrategies = await this.applyRoomUnlockStrategy(cartSnapshot);
    strategies.push(...roomStrategies);

    return strategies;
  }

  /**
   * BUNDLE_DISCOUNT: Suggest complementary items as bundles
   */
  private async applyBundleStrategy(cartSnapshot: CartSnapshot): Promise<BundleStrategy[]> {
    const strategies: BundleStrategy[] = [];
    const { categories, cartValue } = cartSnapshot;

    if (cartSnapshot.itemCount === 1 && categories.length === 1) {
      // Single item cart - perfect for bundling
      const baseCategory = categories[0];
      const complementaryItems = await this.findComplementaryProducts(baseCategory, 2);

      if (complementaryItems.length >= 1) {
        const bundleValue = complementaryItems.reduce((sum, item) => sum + item.price, 0);
        const discountPercent = Math.min(15, Math.max(this.MIN_BUNDLE_DISCOUNT, bundleValue * 0.1));

        strategies.push({
          strategy: 'BUNDLE_DISCOUNT',
          message: `Complete your ${baseCategory} collection with ${discountPercent}% off the bundle! 📦`,
          products: complementaryItems,
          expectedUplift: bundleValue * (1 - discountPercent / 100),
          confidence: 0.8,
          bundleItems: complementaryItems.map(p => p.id),
          discountPercent
        });
      }
    }

    return strategies;
  }

  /**
   * COMPLETE_THE_LOOK: Suggest items that complement existing cart
   */
  private async applyCompleteTheLookStrategy(cartSnapshot: CartSnapshot): Promise<ComplementaryStrategy[]> {
    const strategies: ComplementaryStrategy[] = [];
    const { categories } = cartSnapshot;

    for (const category of categories) {
      const complementaryCategory = this.getComplementaryCategory(category);
      if (complementaryCategory && !categories.includes(complementaryCategory)) {
        const complementaryProducts = await this.findTopProductsInCategory(complementaryCategory, 2);

        if (complementaryProducts.length > 0) {
          strategies.push({
            strategy: 'COMPLETE_THE_LOOK',
            message: `Complete your look with ${complementaryCategory} items! ✨`,
            products: complementaryProducts.map(p => ({
              id: p.id,
              title: p.title,
              price: p.price,
              reason: `Complements your ${category} items perfectly`
            })),
            expectedUplift: complementaryProducts.reduce((sum, p) => sum + p.price, 0),
            confidence: 0.7,
            baseCategory: category,
            complementaryCategory
          });
        }
      }
    }

    return strategies;
  }

  /**
   * RISK_REASSURANCE: Reduce purchase anxiety for high-value carts
   */
  private async applyRiskReassuranceStrategy(cartSnapshot: CartSnapshot): Promise<StrategyResult[]> {
    const strategies: StrategyResult[] = [];

    // Find high-rated, returnable products in similar price range
    const avgCartPrice = cartSnapshot.cartValue / cartSnapshot.itemCount;
    const reassuranceProducts = await this.findHighRatedReturnableProducts(avgCartPrice, 2);

    if (reassuranceProducts.length > 0) {
      strategies.push({
        strategy: 'RISK_REASSURANCE',
        message: `Easy returns, trusted brands - shop with confidence! 🔒`,
        products: reassuranceProducts.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          reason: 'High-rated with easy returns'
        })),
        expectedUplift: reassuranceProducts.reduce((sum, p) => sum + p.price, 0) * 0.3, // Conservative uplift
        confidence: 0.6
      });
    }

    return strategies;
  }

  /**
   * SCARCITY: Highlight limited stock items
   */
  private async applyScarcityStrategy(cartSnapshot: CartSnapshot): Promise<StrategyResult[]> {
    const strategies: StrategyResult[] = [];

    // Find products with low stock in user's preferred categories
    const scarcityProducts = await this.findLowStockProducts(cartSnapshot.categories, 2);

    if (scarcityProducts.length > 0) {
      strategies.push({
        strategy: 'SCARCITY',
        message: `Limited stock - popular items selling fast! ⚡`,
        products: scarcityProducts.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          reason: `Only ${p.stock} left in stock`
        })),
        expectedUplift: scarcityProducts.reduce((sum, p) => sum + p.price, 0) * 0.4,
        confidence: 0.75
      });
    }

    return strategies;
  }

  /**
   * SOCIAL_PROOF: Show popular/trending items
   */
  private async applySocialProofStrategy(cartSnapshot: CartSnapshot): Promise<StrategyResult[]> {
    const strategies: StrategyResult[] = [];

    // Find trending products not in cart
    const trendingProducts = await this.findTrendingProducts(cartSnapshot.categories, 2);

    if (trendingProducts.length > 0) {
      strategies.push({
        strategy: 'SOCIAL_PROOF',
        message: `Everyone's adding these - join the trend! 📈`,
        products: trendingProducts.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          reason: 'Trending this week'
        })),
        expectedUplift: trendingProducts.reduce((sum, p) => sum + p.price, 0) * 0.35,
        confidence: 0.65
      });
    }

    return strategies;
  }

  /**
   * Apply room unlock threshold strategy
   */
  private async applyRoomUnlockStrategy(cartSnapshot: CartSnapshot): Promise<ThresholdPushStrategy[]> {
    const strategies: ThresholdPushStrategy[] = [];
    const { cartValue, itemCount } = cartSnapshot;

    // Find active rooms near unlock thresholds
    const activeRooms = await (this.prisma as any).room.findMany({
      where: {
        status: 'LOCKED',
        endAt: { gt: new Date() },
        OR: [
          { unlockMinOrders: { lte: itemCount + 2 } },
          { unlockMinValue: { lte: cartValue + 500 } }
        ]
      },
      take: 2
    });

    for (const room of activeRooms) {
      let message = '';
      let difference = 0;
      let threshold = 0;

      if (room.unlockMinOrders && itemCount < room.unlockMinOrders) {
        difference = room.unlockMinOrders - itemCount;
        threshold = room.unlockMinOrders;
        message = `Add ${difference} more item${difference > 1 ? 's' : ''} to unlock "${room.name}" room! 🏆`;
      } else if (room.unlockMinValue && cartValue < room.unlockMinValue) {
        difference = room.unlockMinValue - cartValue;
        threshold = room.unlockMinValue;
        message = `Add ₹${difference} more to unlock "${room.name}" room! 🏆`;
      }

      if (difference > 0 && difference <= 400) {
        const suggestedProducts = await this.findProductsForThreshold(difference, cartSnapshot.categories);

        if (suggestedProducts.length > 0) {
          strategies.push({
            strategy: 'THRESHOLD_PUSH',
            message,
            products: suggestedProducts,
            expectedUplift: difference,
            confidence: difference <= 200 ? 0.85 : 0.65,
            threshold,
            currentValue: room.unlockMinOrders ? itemCount : cartValue,
            difference
          });
        }
      }
    }

    return strategies;
  }

  /**
   * Helper: Find products that fit a price threshold
   */
  private async findProductsForThreshold(targetAmount: number, excludeCategories: string[]): Promise<any[]> {
    const minPrice = Math.max(50, targetAmount - 200);
    const maxPrice = targetAmount + 100;

    const products = await (this.prisma as any).product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        offerPrice: { gte: minPrice, lte: maxPrice },
        categoryId: excludeCategories.length > 0 ? { notIn: excludeCategories } : undefined
      },
      include: { Category: true },
      orderBy: { popularityScore: 'desc' },
      take: 3
    });

    return products.map(p => ({
      id: p.id,
      title: p.title,
      price: p.offerPrice || p.price,
      reason: `Perfect fit for ₹${targetAmount} threshold`
    }));
  }

  /**
   * Helper: Find gift-eligible products
   */
  private async findGiftProductsForThreshold(targetAmount: number): Promise<any[]> {
    return this.findProductsForThreshold(targetAmount, []);
  }

  /**
   * Helper: Find complementary products
   */
  private async findComplementaryProducts(categoryId: string, limit: number): Promise<any[]> {
    // Find products from related categories
    const complementaryCategory = this.getComplementaryCategory(categoryId);

    const products = await (this.prisma as any).product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        categoryId: complementaryCategory || { not: categoryId }
      },
      orderBy: { popularityScore: 'desc' },
      take: limit
    });

    return products.map(p => ({
      id: p.id,
      title: p.title,
      price: p.offerPrice || p.price,
      reason: 'Complements your current items'
    }));
  }

  /**
   * Helper: Get complementary category mapping
   */
  private getComplementaryCategory(categoryId: string): string | null {
    const complementaryMap: Record<string, string> = {
      // Fashion mappings
      'tops': 'bottoms',
      'bottoms': 'tops',
      'shoes': 'accessories',
      'accessories': 'shoes',
      // Electronics mappings
      'phones': 'phone-cases',
      'laptops': 'bags',
      // Add more mappings as needed
    };

    return complementaryMap[categoryId.toLowerCase()] || null;
  }

  /**
   * Helper: Find top products in a category
   */
  private async findTopProductsInCategory(categoryId: string, limit: number): Promise<any[]> {
    const products = await (this.prisma as any).product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        categoryId
      },
      orderBy: { popularityScore: 'desc' },
      take: limit
    });

    return products;
  }

  /**
   * Helper: Find high-rated, returnable products
   */
  private async findHighRatedReturnableProducts(priceRange: number, limit: number): Promise<any[]> {
    const minPrice = priceRange * 0.8;
    const maxPrice = priceRange * 1.5;

    const products = await (this.prisma as any).product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        offerPrice: { gte: minPrice, lte: maxPrice },
        isReturnable: true
      },
      include: {
        reviews: {
          where: { rating: { gte: 4 } },
          select: { rating: true }
        }
      },
      take: limit * 2
    });

    // Filter products with high average rating
    return products
      .filter(p => {
        const avgRating = p.reviews.length > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
          : 0;
        return avgRating >= 4.2;
      })
      .slice(0, limit)
      .map(p => ({
        id: p.id,
        title: p.title,
        price: p.offerPrice || p.price,
        stock: p.stock
      }));
  }

  /**
   * Helper: Find low stock products
   */
  private async findLowStockProducts(excludeCategories: string[], limit: number): Promise<any[]> {
    const products = await (this.prisma as any).product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0, lte: 5 }, // Very low stock
        categoryId: excludeCategories.length > 0 ? { notIn: excludeCategories } : undefined
      },
      orderBy: { stock: 'asc' },
      take: limit
    });

    return products;
  }

  /**
   * Helper: Find trending products
   */
  private async findTrendingProducts(excludeCategories: string[], limit: number): Promise<any[]> {
    // Use view counts or recent orders as trending indicator
    const products = await (this.prisma as any).product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        categoryId: excludeCategories.length > 0 ? { notIn: excludeCategories } : undefined
      },
      orderBy: { popularityScore: 'desc' },
      take: limit
    });

    return products;
  }

  /**
   * Rank and filter strategies based on priority and cart context
   */
  private rankAndFilterStrategies(strategies: StrategyResult[], cartSnapshot: CartSnapshot): StrategyResult[] {
    // Priority order: THRESHOLD_PUSH > BUNDLE_DISCOUNT > SCARCITY > SOCIAL_PROOF > COMPLETE_THE_LOOK > RISK_REASSURANCE
    const priorityOrder = [
      'THRESHOLD_PUSH',
      'BUNDLE_DISCOUNT',
      'SCARCITY',
      'SOCIAL_PROOF',
      'COMPLETE_THE_LOOK',
      'RISK_REASSURANCE'
    ];

    // Sort by priority, then by confidence, then by expected uplift
    strategies.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.strategy);
      const bPriority = priorityOrder.indexOf(b.strategy);

      if (aPriority !== bPriority) return aPriority - bPriority;
      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      return b.expectedUplift - a.expectedUplift;
    });

    // Limit to top 3 strategies to avoid overwhelming user
    return strategies.slice(0, 3);
  }

  /**
   * Cache strategy results for performance
   */
  async cacheStrategyResult(userId: string, strategies: StrategyResult[]): Promise<void> {
    const cacheKey = `bow:strategies:${userId}`;
    await this.redis.set(cacheKey, JSON.stringify(strategies), 10 * 60); // 10 minutes
  }

  /**
   * Get cached strategies
   */
  async getCachedStrategies(userId: string): Promise<StrategyResult[] | null> {
    const cacheKey = `bow:strategies:${userId}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Analyze strategy performance for optimization
   */
  async analyzeStrategyPerformance(strategy: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = { strategy };
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [totalShown, totalAccepted, revenueImpact] = await Promise.all([
      (this.prisma as any).recommendationEvent.count({ where: whereClause }),
      (this.prisma as any).recommendationEvent.count({
        where: { ...whereClause, accepted: true }
      }),
      (this.prisma as any).recommendationEvent.aggregate({
        where: { ...whereClause, cartValueAfter: { not: null } },
        _sum: { cartValueAfter: true, cartValueBefore: true }
      })
    ]);

    const acceptanceRate = totalShown > 0 ? totalAccepted / totalShown : 0;
    const avgUplift = revenueImpact._sum.cartValueAfter && revenueImpact._sum.cartValueBefore
      ? (revenueImpact._sum.cartValueAfter - revenueImpact._sum.cartValueBefore) / revenueImpact._count
      : 0;

    return {
      strategy,
      totalShown,
      totalAccepted,
      acceptanceRate,
      averageUplift: avgUplift || 0
    };
  }
}