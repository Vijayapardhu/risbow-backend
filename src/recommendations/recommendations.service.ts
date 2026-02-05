import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserInteractionType } from '@prisma/client';

interface RecommendationOptions {
  limit?: number;
  categoryId?: string;
  excludeProductIds?: string[];
  minScore?: number;
}

interface ProductScore {
  productId: string;
  score: number;
  reason: string;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RECOMMENDATIONS = 20;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Get personalized recommendations for a user
   * Combines collaborative filtering, content-based, and user history
   */
  async getPersonalizedRecommendations(
    userId: string,
    options: RecommendationOptions = {},
  ): Promise<any[]> {
    const limit = Math.min(options.limit || 10, this.MAX_RECOMMENDATIONS);
    const cacheKey = `recommendations:for-you:${userId}:${limit}`;

    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user ${userId}`);
      return JSON.parse(cached);
    }

    // Get user's interaction history
    const userHistory = await this.getUserInteractionHistory(userId);
    
    // If user has no history, return trending products
    if (userHistory.length === 0) {
      const trending = await this.getTrendingProducts({ limit });
      await this.redis.set(cacheKey, JSON.stringify(trending), this.CACHE_TTL);
      return trending;
    }

    // Combine multiple recommendation strategies
    const [collaborative, contentBased, trending] = await Promise.all([
      this.getCollaborativeFilteringRecommendations(userId, { limit: limit * 2 }),
      this.getContentBasedRecommendations(userId, { limit: limit * 2 }),
      this.getTrendingProducts({ limit: limit }),
    ]);

    // Merge and rank recommendations
    const merged = this.mergeAndRankRecommendations(
      collaborative,
      contentBased,
      trending,
      {
        collaborativeWeight: 0.5,
        contentWeight: 0.3,
        trendingWeight: 0.2,
      },
    );

    // Exclude already purchased/viewed products
    const viewedProductIds = new Set(userHistory.map((h) => h.productId));
    const filtered = merged.filter((p) => !viewedProductIds.has(p.productId));

    // Get top N recommendations
    const topRecommendations = filtered.slice(0, limit);

    // Fetch full product details
    const productIds = topRecommendations.map((r) => r.productId);
    const products = await this.fetchProductDetails(productIds);

    // Cache the results
    await this.redis.set(cacheKey, JSON.stringify(products), this.CACHE_TTL);

    return products;
  }

  /**
   * Get similar products based on pre-calculated similarities
   */
  async getSimilarProducts(
    productId: string,
    options: RecommendationOptions = {},
  ): Promise<any[]> {
    const limit = Math.min(options.limit || 10, this.MAX_RECOMMENDATIONS);
    const cacheKey = `recommendations:similar:${productId}:${limit}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get pre-calculated similarities
    const similarities = await this.prisma.productSimilarity.findMany({
      where: { productId },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        Product_ProductSimilarity_similarProductIdToProduct: {
          include: {
            Category: true,
            Vendor: {
              select: {
                id: true,
                name: true,
                storeName: true,
              },
            },
          },
        },
      },
    });

    const products = similarities.map((s) => ({
      ...s.Product_ProductSimilarity_similarProductIdToProduct,
      similarityScore: s.score,
      algorithm: s.algorithm,
    }));

    // If no pre-calculated similarities, fall back to content-based
    if (products.length === 0) {
      const fallback = await this.calculateSimilarProductsOnTheFly(productId, limit);
      await this.redis.set(cacheKey, JSON.stringify(fallback), this.CACHE_TTL);
      return fallback;
    }

    await this.redis.set(cacheKey, JSON.stringify(products), this.CACHE_TTL);
    return products;
  }

  /**
   * Get trending products based on recent interactions
   */
  async getTrendingProducts(options: RecommendationOptions = {}): Promise<any[]> {
    const limit = Math.min(options.limit || 10, this.MAX_RECOMMENDATIONS);
    const cacheKey = `recommendations:trending:${limit}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get trending products from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Aggregate interactions with weighted scoring
    const trendingData = await this.prisma.userProductInteraction.groupBy({
      by: ['productId'],
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: {
        interactionType: true,
      },
      orderBy: {
        _count: {
          interactionType: 'desc',
        },
      },
      take: limit * 2,
    });

    // Calculate trending scores with recency weight
    const scoredProducts = await Promise.all(
      trendingData.map(async (item) => {
        const recentInteractions = await this.prisma.userProductInteraction.findMany({
          where: {
            productId: item.productId,
            createdAt: { gte: sevenDaysAgo },
          },
          select: {
            interactionType: true,
            createdAt: true,
          },
        });

        // Weight different interaction types
        const weights = {
          PURCHASE: 5,
          ADD_TO_CART: 3,
          WISHLIST: 2,
          VIEW: 1,
          REMOVE_FROM_CART: -1,
        };

        let score = 0;
        const now = Date.now();

        recentInteractions.forEach((interaction) => {
          const daysSince = (now - interaction.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          const recencyMultiplier = Math.max(1 - daysSince / 7, 0.1); // Decay over 7 days
          score += (weights[interaction.interactionType] || 0) * recencyMultiplier;
        });

        return { productId: item.productId, score };
      }),
    );

    // Sort by score and get product details
    scoredProducts.sort((a, b) => b.score - a.score);
    const topProductIds = scoredProducts.slice(0, limit).map((p) => p.productId);
    const products = await this.fetchProductDetails(topProductIds);

    await this.redis.set(cacheKey, JSON.stringify(products), this.CACHE_TTL);
    return products;
  }

  /**
   * Get frequently bought together products
   */
  async getFrequentlyBoughtTogether(
    productId: string,
    options: RecommendationOptions = {},
  ): Promise<any[]> {
    const limit = Math.min(options.limit || 5, this.MAX_RECOMMENDATIONS);
    const cacheKey = `recommendations:fbt:${productId}:${limit}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Find orders containing this product
    const ordersWithProduct = await this.prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
      distinct: ['orderId'],
      take: 1000, // Limit to recent orders for performance
    });

    const orderIds = ordersWithProduct.map((o) => o.orderId);

    if (orderIds.length === 0) {
      return [];
    }

    // Find other products in those orders
    const coPurchasedProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: limit,
    });

    const productIds = coPurchasedProducts.map((p) => p.productId);
    const products = await this.fetchProductDetails(productIds);

    await this.redis.set(cacheKey, JSON.stringify(products), this.CACHE_TTL);
    return products;
  }

  /**
   * Track user interaction for recommendations
   */
  async trackInteraction(
    userId: string,
    productId: string,
    interactionType: UserInteractionType,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.prisma.userProductInteraction.create({
        data: {
          userId,
          productId,
          interactionType,
          metadata,
        },
      });

      // Invalidate user's recommendation cache
      await this.invalidateUserCache(userId);

      this.logger.debug(`Tracked ${interactionType} for user ${userId} on product ${productId}`);
    } catch (error) {
      this.logger.error(`Failed to track interaction: ${error.message}`);
    }
  }

  /**
   * Collaborative filtering: Users who bought X also bought Y
   */
  private async getCollaborativeFilteringRecommendations(
    userId: string,
    options: RecommendationOptions,
  ): Promise<ProductScore[]> {
    // Get user's purchase history
    const userPurchases = await this.prisma.userProductInteraction.findMany({
      where: {
        userId,
        interactionType: UserInteractionType.PURCHASE,
      },
      select: { productId: true },
      distinct: ['productId'],
    });

    const userProductIds = userPurchases.map((p) => p.productId);

    if (userProductIds.length === 0) {
      return [];
    }

    // Find similar users (users who bought the same products)
    const similarUsers = await this.prisma.userProductInteraction.groupBy({
      by: ['userId'],
      where: {
        productId: { in: userProductIds },
        userId: { not: userId },
        interactionType: UserInteractionType.PURCHASE,
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: 50, // Top 50 similar users
    });

    const similarUserIds = similarUsers.map((u) => u.userId);

    if (similarUserIds.length === 0) {
      return [];
    }

    // Get products purchased by similar users
    const recommendations = await this.prisma.userProductInteraction.groupBy({
      by: ['productId'],
      where: {
        userId: { in: similarUserIds },
        productId: { notIn: userProductIds },
        interactionType: UserInteractionType.PURCHASE,
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: options.limit || 20,
    });

    return recommendations.map((r) => ({
      productId: r.productId,
      score: r._count.productId / similarUsers.length,
      reason: 'collaborative_filtering',
    }));
  }

  /**
   * Content-based filtering: Similar products based on attributes
   */
  private async getContentBasedRecommendations(
    userId: string,
    options: RecommendationOptions,
  ): Promise<ProductScore[]> {
    // Get user's liked products (purchases, wishlist, high-engagement views)
    const likedProducts = await this.prisma.userProductInteraction.findMany({
      where: {
        userId,
        interactionType: {
          in: [UserInteractionType.PURCHASE, UserInteractionType.WISHLIST],
        },
      },
      select: { productId: true },
      distinct: ['productId'],
      take: 10,
    });

    if (likedProducts.length === 0) {
      return [];
    }

    const likedProductIds = likedProducts.map((p) => p.productId);

    // Get attributes of liked products
    const likedProductDetails = await this.prisma.product.findMany({
      where: { id: { in: likedProductIds } },
      select: {
        id: true,
        categoryId: true,
        brandName: true,
        tags: true,
      },
    });

    // Extract common categories and tags
    const categoryIds = [...new Set(likedProductDetails.map((p) => p.categoryId))];
    const allTags = likedProductDetails.flatMap((p) => p.tags || []);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const commonTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    // Find similar products
    const similarProducts = await this.prisma.product.findMany({
      where: {
        id: { notIn: likedProductIds },
        isActive: true,
        OR: [
          { categoryId: { in: categoryIds } },
          { tags: { hasSome: commonTags } },
        ],
      },
      select: {
        id: true,
        categoryId: true,
        tags: true,
        brandName: true,
      },
      take: options.limit ? options.limit * 2 : 40,
    });

    // Score products based on similarity
    const scored = similarProducts.map((product) => {
      let score = 0;

      // Category match
      if (categoryIds.includes(product.categoryId)) {
        score += 0.5;
      }

      // Tag overlap
      const productTags = product.tags || [];
      const tagOverlap = productTags.filter((tag) => commonTags.includes(tag)).length;
      score += (tagOverlap / Math.max(commonTags.length, 1)) * 0.5;

      return {
        productId: product.id,
        score,
        reason: 'content_based',
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate similar products on-the-fly when no pre-calculated data exists
   */
  private async calculateSimilarProductsOnTheFly(
    productId: string,
    limit: number,
  ): Promise<any[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        categoryId: true,
        tags: true,
        brandName: true,
      },
    });

    if (!product) {
      return [];
    }

    const similarProducts = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        isActive: true,
        OR: [
          { categoryId: product.categoryId },
          { tags: { hasSome: product.tags || [] } },
          { brandName: product.brandName },
        ],
      },
      include: {
        Category: true,
        Vendor: {
          select: {
            id: true,
            name: true,
            storeName: true,
          },
        },
      },
      take: limit,
    });

    return similarProducts;
  }

  /**
   * Merge and rank recommendations from multiple sources
   */
  private mergeAndRankRecommendations(
    collaborative: ProductScore[],
    contentBased: ProductScore[],
    trending: any[],
    weights: { collaborativeWeight: number; contentWeight: number; trendingWeight: number },
  ): ProductScore[] {
    const scoreMap = new Map<string, number>();

    // Add collaborative scores
    collaborative.forEach((item) => {
      scoreMap.set(
        item.productId,
        (scoreMap.get(item.productId) || 0) + item.score * weights.collaborativeWeight,
      );
    });

    // Add content-based scores
    contentBased.forEach((item) => {
      scoreMap.set(
        item.productId,
        (scoreMap.get(item.productId) || 0) + item.score * weights.contentWeight,
      );
    });

    // Add trending scores (normalize to 0-1 range)
    const maxTrendingScore = trending.length > 0 ? 1 : 1;
    trending.forEach((item, index) => {
      const normalizedScore = 1 - index / trending.length;
      scoreMap.set(
        item.id,
        (scoreMap.get(item.id) || 0) + normalizedScore * weights.trendingWeight,
      );
    });

    // Convert to array and sort
    const ranked = Array.from(scoreMap.entries())
      .map(([productId, score]) => ({ productId, score, reason: 'hybrid' }))
      .sort((a, b) => b.score - a.score);

    return ranked;
  }

  /**
   * Get user's interaction history
   */
  private async getUserInteractionHistory(userId: string) {
    return this.prisma.userProductInteraction.findMany({
      where: { userId },
      select: {
        productId: true,
        interactionType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Fetch full product details
   */
  private async fetchProductDetails(productIds: string[]) {
    return this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        Category: true,
        Vendor: {
          select: {
            id: true,
            name: true,
            storeName: true,
          },
        },
      },
    });
  }

  /**
   * Invalidate user's recommendation cache
   */
  private async invalidateUserCache(userId: string) {
    const pattern = `recommendations:for-you:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
    }
  }

  /**
   * Cron job to calculate product similarities daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async calculateProductSimilarities() {
    this.logger.log('Starting daily product similarity calculation...');

    try {
      const startTime = Date.now();

      // Get all active products
      const products = await this.prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          categoryId: true,
          tags: true,
          brandName: true,
        },
      });

      this.logger.log(`Calculating similarities for ${products.length} products`);

      // Calculate similarities in batches to avoid memory issues
      const batchSize = 100;
      let totalSimilarities = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        for (const product of batch) {
          const similarities = await this.calculateSimilaritiesForProduct(product, products);

          // Store top 20 similarities
          const topSimilarities = similarities.slice(0, 20);

          // Delete old similarities
          await this.prisma.productSimilarity.deleteMany({
            where: {
              productId: product.id,
              algorithm: 'content_based',
            },
          });

          // Insert new similarities
          if (topSimilarities.length > 0) {
            await this.prisma.productSimilarity.createMany({
              data: topSimilarities.map((sim) => ({
                productId: product.id,
                similarProductId: sim.productId,
                score: sim.score,
                algorithm: 'content_based',
              })),
            });

            totalSimilarities += topSimilarities.length;
          }
        }

        this.logger.debug(`Processed batch ${i / batchSize + 1} of ${Math.ceil(products.length / batchSize)}`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(`Similarity calculation completed. ${totalSimilarities} similarities calculated in ${duration}s`);
    } catch (error) {
      this.logger.error(`Failed to calculate product similarities: ${error.message}`, error.stack);
    }
  }

  /**
   * Calculate similarities for a single product
   */
  private calculateSimilaritiesForProduct(
    product: { id: string; categoryId: string; tags: string[]; brandName: string | null },
    allProducts: { id: string; categoryId: string; tags: string[]; brandName: string | null }[],
  ): { productId: string; score: number }[] {
    const similarities: { productId: string; score: number }[] = [];

    for (const otherProduct of allProducts) {
      if (product.id === otherProduct.id) continue;

      let score = 0;

      // Same category: +0.5
      if (product.categoryId === otherProduct.categoryId) {
        score += 0.5;
      }

      // Same brand: +0.3
      if (product.brandName && product.brandName === otherProduct.brandName) {
        score += 0.3;
      }

      // Tag overlap
      const productTags = product.tags || [];
      const otherTags = otherProduct.tags || [];
      const tagOverlap = productTags.filter((tag) => otherTags.includes(tag)).length;
      const maxTags = Math.max(productTags.length, otherTags.length, 1);
      score += (tagOverlap / maxTags) * 0.2;

      if (score > 0) {
        similarities.push({ productId: otherProduct.id, score });
      }
    }

    // Sort by score descending
    return similarities.sort((a, b) => b.score - a.score);
  }
}
