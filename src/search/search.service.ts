import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { SearchQueryDto, SortOption } from './dto/search.dto';
import { Prisma } from '@prisma/client';
import { BowRecommendationEngine } from '../bow/bow-recommendation.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TrendingService } from './trending.service';
import { OpenRouterService } from '../shared/openrouter.service';
import { randomUUID } from 'crypto';

/**
 * SearchIntent: Determines user's search behavior pattern
 * - TRANSACTIONAL: User wants to buy (specific product names, brands)
 * - EXPLORATORY: User is browsing (general categories, "best", "cheap")
 */
export enum SearchIntent {
  TRANSACTIONAL = 'transactional',
  EXPLORATORY = 'exploratory',
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  // Common category keywords for intent detection and category mapping
  private readonly CATEGORY_KEYWORDS: Record<string, string[]> = {
    'smartphones': ['phone', 'mobile', 'iphone', 'samsung', 'galaxy', 'android', 'smartphone'],
    'laptops': ['laptop', 'macbook', 'notebook', 'chromebook', 'ultrabook'],
    'electronics': ['tv', 'television', 'monitor', 'speaker', 'headphone', 'earbuds', 'camera'],
    'clothing': ['shirt', 'tshirt', 'jeans', 'pants', 'dress', 'jacket', 'sweater', 'hoodie'],
    'footwear': ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'loafers'],
    'accessories': ['watch', 'bag', 'wallet', 'belt', 'sunglasses', 'jewelry'],
    'home': ['furniture', 'decor', 'kitchen', 'appliance', 'bedding', 'curtain'],
    'beauty': ['makeup', 'skincare', 'perfume', 'cosmetic', 'lotion', 'cream'],
  };

  // Exploratory intent indicators
  private readonly EXPLORATORY_KEYWORDS = ['best', 'cheap', 'affordable', 'top', 'trending', 'popular', 'new', 'sale', 'discount', 'under'];

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private bowRecommendation: BowRecommendationEngine,
    private elasticsearchService: ElasticsearchService,
    @InjectQueue('search-sync') private searchSyncQueue: Queue,
    private trendingService: TrendingService,
    private openRouterService: OpenRouterService,
  ) { }

  /**
   * Performs semantic vector search using OpenRouter embeddings.
   * Fallback for complex intent-based queries.
   */
  async semanticSearch(query: string, limit: number = 10) {
    const queryVector = await this.openRouterService.getEmbedding(query);
    if (!queryVector || queryVector.length === 0) return [];

    // Since we don't have pgvector extension confirmed, we'll use a raw SQL query 
    // to calculate cosine similarity if the DB supports it, or use a basic approach.
    // PostgreSQL native: SELECT 1 - (embedding <=> '[v1, v2, ...]') as similarity

    try {
      const vectorLiteral = `[${queryVector.join(',')}]`;
      const results = await this.prisma.$queryRaw<any[]>`
            SELECT id, title, price, "offerPrice", images, "brandName",
                   (1 - (embedding::jsonb::text::vector <=> ${vectorLiteral}::vector)) as similarity
            FROM "Product"
            WHERE embedding IS NOT NULL AND "isActive" = true
            ORDER BY similarity DESC
            LIMIT ${limit}
        `;

      return results.map(r => ({ ...r, _semanticScore: r.similarity }));
    } catch (error) {
      this.logger.warn('Native vector search failed (pgvector missing?). Falling back to manual relevance.');
      // If SQL fails, we could do in-memory but that's slow. 
      // For now, return empty to trigger next fallback.
      return [];
    }
  }

  // 1️⃣ Normalize User Query
  private normalizeQuery(query: string): string {
    if (!query) return '';
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/gi, '') // Remove special chars
      .replace(/\s+/g, ' '); // Collapse spaces
  }

  // 1️⃣b Detect Search Intent
  /**
   * Determines if search is transactional (wants to buy) or exploratory (browsing).
   * Transactional: "iphone 15 pro 256gb" - specific, ready to purchase
   * Exploratory: "best phones under 20000" - researching, comparing
   */
  detectIntent(query: string): { intent: SearchIntent; confidence: number } {
    const normalized = this.normalizeQuery(query);
    const words = normalized.split(' ');

    // Check for exploratory keywords
    const hasExploratory = words.some(w => this.EXPLORATORY_KEYWORDS.includes(w));

    // Check for specific product indicators (numbers, model names, specific brands)
    const hasSpecificModel = /\d{2,}/.test(normalized); // Has 2+ digit numbers (model numbers)
    const hasMultipleWords = words.length >= 3;
    const hasBrand = this.hasBrandKeyword(normalized);

    // Scoring logic
    let transactionalScore = 0;
    if (hasSpecificModel) transactionalScore += 40;
    if (hasBrand) transactionalScore += 30;
    if (hasMultipleWords && !hasExploratory) transactionalScore += 20;

    let exploratoryScore = 0;
    if (hasExploratory) exploratoryScore += 50;
    if (words.length <= 2 && !hasSpecificModel) exploratoryScore += 30;

    const intent = transactionalScore > exploratoryScore
      ? SearchIntent.TRANSACTIONAL
      : SearchIntent.EXPLORATORY;

    const confidence = Math.max(transactionalScore, exploratoryScore) / 100;

    return { intent, confidence: Math.min(confidence, 1) };
  }

  // Check if query contains brand-like keywords
  private hasBrandKeyword(query: string): boolean {
    const brandPatterns = ['samsung', 'apple', 'iphone', 'nike', 'adidas', 'sony', 'lg', 'hp', 'dell', 'oneplus', 'xiaomi', 'realme'];
    return brandPatterns.some(b => query.includes(b));
  }

  // 1️⃣c Extract Keywords
  /**
   * Extracts meaningful keywords from query, filtering stop words.
   */
  extractKeywords(query: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can']);

    return this.normalizeQuery(query)
      .split(' ')
      .filter(word => word.length > 1 && !stopWords.has(word));
  }

  // 1️⃣d Suggest Category from Keywords
  /**
   * Maps search keywords to likely category.
   * Used for fallback suggestions and miss analytics.
   */
  async suggestCategory(keywords: string[]): Promise<{ categoryId: string | null; categoryName: string | null; confidence: number }> {
    // Try keyword-based mapping first
    for (const [categoryName, patterns] of Object.entries(this.CATEGORY_KEYWORDS)) {
      const matchCount = keywords.filter(k => patterns.some(p => k.includes(p) || p.includes(k))).length;
      if (matchCount > 0) {
        // Look up actual category ID
        const category = await this.prisma.category.findFirst({
          where: {
            name: { contains: categoryName, mode: 'insensitive' },
            isActive: true,
          },
          select: { id: true, name: true },
        });

        if (category) {
          return {
            categoryId: category.id,
            categoryName: category.name,
            confidence: Math.min(matchCount / keywords.length, 0.9),
          };
        }
      }
    }

    // Fallback: Try direct category name match
    for (const keyword of keywords) {
      const category = await this.prisma.category.findFirst({
        where: {
          name: { contains: keyword, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true, name: true },
      });

      if (category) {
        return {
          categoryId: category.id,
          categoryName: category.name,
          confidence: 0.5,
        };
      }
    }

    return { categoryId: null, categoryName: null, confidence: 0 };
  }

  // 2️⃣ Main Search Logic
  async searchProducts(dto: SearchQueryDto, userId?: string, region: string = 'global') {
    const normalized = this.normalizeQuery(dto.q || '');
    const cacheKey = `search:v1:${normalized}:${JSON.stringify(dto)}`;

    // A. Cache Check
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      // Track trending even for cached results
      if (normalized) {
        this.trendingService.incrementSearch(normalized, region).catch(() => { });
      }
      return JSON.parse(cached);
    }

    // Detect intent for analytics and potential result adjustment
    const intentResult = normalized ? this.detectIntent(normalized) : null;

    // --- HYBRID SEARCH: Try Elasticsearch First ---
    try {
      const esResult = await this.searchElasticsearch(dto);
      if (esResult && esResult.meta.total > 0) {
        // Track trending for successful ES search
        if (normalized) {
          this.trendingService.incrementSearch(normalized, region).catch(() => { });
        }
        return { ...esResult, meta: { ...esResult.meta, intent: intentResult } };
      }
    } catch (error) {
      this.logger.error(`Elasticsearch failed, falling back to DB: ${error.message}`);
    }

    // B. Database Query Construction
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      stock: dto.inStock ? { gt: 0 } : undefined,
      price: {
        gte: dto.minPrice,
        lte: dto.maxPrice
      },
      categoryId: dto.categoryId
    };

    if (normalized) {
      where.OR = [
        { title: { contains: normalized, mode: 'insensitive' } },
        { description: { contains: normalized, mode: 'insensitive' } },
        { brandName: { contains: normalized, mode: 'insensitive' } },
        { tags: { has: normalized } }
      ];
    }

    const isRelevance = !dto.sort || dto.sort === SortOption.RELEVANCE;

    // --- CASE 1: Standard DB Sort (Price, Newest, Rating) ---
    if (!isRelevance) {
      const orderBy = this.getSortOrder(dto.sort);
      const page = dto.page || 1;
      const limit = dto.limit || 20;
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          orderBy,
          take: limit,
          skip,
          include: { Vendor: { select: { name: true, performanceScore: true } } }
        }),
        this.prisma.product.count({ where })
      ]);

      // Handle zero results - fallback strategy
      if (total === 0 && normalized) {
        // --- 🤖 Phase 6.2: Semantic Discovery Fallback ---
        const semanticResults = await this.semanticSearch(normalized, limit);
        if (semanticResults.length > 0) {
          return {
            data: semanticResults,
            meta: {
              total: semanticResults.length,
              page: 1,
              lastPage: 1,
              fallback: 'semantic',
              originalQuery: dto.q,
              intent: intentResult,
            }
          };
        }

        return this.handleSearchMiss(dto, normalized, userId, region, page, limit, intentResult);
      }

      // Track trending for successful search
      if (normalized) {
        this.trendingService.incrementSearch(normalized, region).catch(() => { });
      }

      return this.buildResult(products, total, page, limit, cacheKey, intentResult);
    }

    // --- CASE 2: Relevance Sort (In-Memory Weighted Scoring) ---
    // Fetch CANDIDATES (boost limit for re-ranking)
    const candidateLimit = 100;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: candidateLimit,
        include: { Vendor: { select: { name: true, performanceScore: true } } }
      }),
      this.prisma.product.count({ where })
    ]);

    // Handle zero results - fallback strategy
    if (total === 0 && normalized) {
      return this.handleSearchMiss(dto, normalized, userId, region, dto.page || 1, dto.limit || 20, intentResult);
    }

    // Track trending for successful search
    if (normalized) {
      this.trendingService.incrementSearch(normalized, region).catch(() => { });
    }

    // Rate & Sort
    const scoredProducts = products.map(p => {
      let score = 0;

      // 1. Text Match (45%)
      const titleMatch = p.title.toLowerCase().includes(normalized) ? 100 : 0;
      const brandMatch = p.brandName?.toLowerCase().includes(normalized) ? 80 : 0;
      const tagMatch = p.tags.some(t => t.toLowerCase() === normalized) ? 70 : 0;
      const textScore = Math.max(titleMatch, brandMatch, tagMatch);

      // 2. Popularity (20%)
      const popularity = (p as any).popularityScore || 0;

      // 3. Price Attractiveness (15%)
      const discount = p.offerPrice ? ((p.price - p.offerPrice) / p.price) * 100 : 0;
      const priceScore = Math.min(discount, 100);

      // 4. Availability (10%)
      const stockScore = p.stock > 10 ? 100 : (p.stock > 0 ? 50 : 0);

      // Final Weighted Score
      score = (textScore * 0.45)
        + (popularity * 0.20)
        + (priceScore * 0.15)
        + (stockScore * 0.10);

      return { ...p, _relevanceScore: score };
    })
      .sort((a, b) => b._relevanceScore - a._relevanceScore); // Descending

    // Apply Pagination to memory list
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const paginated = scoredProducts.slice((page - 1) * limit, page * limit);

    return this.buildResult(paginated, total, page, limit, cacheKey, intentResult);
  }

  /**
   * Handle search miss with fallback strategy:
   * 1. Log miss for analytics
   * 2. Try category-based fallback
   * 3. Get recommendations from Bow
   */
  private async handleSearchMiss(
    dto: SearchQueryDto,
    normalized: string,
    userId: string | undefined,
    region: string,
    page: number,
    limit: number,
    intentResult: { intent: SearchIntent; confidence: number } | null,
  ): Promise<any> {
    // Extract keywords and suggest category
    const keywords = this.extractKeywords(normalized);
    const categoryInfo = await this.suggestCategory(keywords);

    // Log the miss for analytics
    await this.logSearchMiss(dto.q || normalized, normalized, userId, region, keywords, categoryInfo.categoryId);

    // Fallback Strategy 1: Try category-based search
    if (categoryInfo.categoryId) {
      const categoryProducts = await this.prisma.product.findMany({
        where: {
          isActive: true,
          categoryId: categoryInfo.categoryId,
          stock: dto.inStock ? { gt: 0 } : undefined,
        },
        orderBy: { popularityScore: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: { Vendor: { select: { name: true, performanceScore: true } } },
      });

      if (categoryProducts.length > 0) {
        const total = await this.prisma.product.count({
          where: {
            isActive: true,
            categoryId: categoryInfo.categoryId,
          },
        });

        return {
          data: categoryProducts,
          meta: {
            total,
            page,
            lastPage: Math.ceil(total / limit),
            fallback: 'category',
            suggestedCategory: categoryInfo.categoryName,
            originalQuery: dto.q,
            intent: intentResult,
          },
        };
      }
    }

    // Fallback Strategy 2: Get Bow recommendations
    try {
      const recommendations = await this.bowRecommendation.getSmartRecommendations(userId, limit);
      if (recommendations.length > 0) {
        return {
          data: recommendations,
          meta: {
            total: recommendations.length,
            page: 1,
            lastPage: 1,
            fallback: 'recommendations',
            message: `No exact matches for "${dto.q}". Here are some popular items.`,
            originalQuery: dto.q,
            intent: intentResult,
          },
        };
      }
    } catch (error) {
      this.logger.warn(`Bow recommendations fallback failed: ${error.message}`);
    }

    // Final fallback: Empty results with suggestions
    return {
      data: [],
      meta: {
        total: 0,
        page,
        lastPage: 1,
        fallback: 'none',
        message: `No results found for "${dto.q}".`,
        suggestions: await this.getSearchSuggestions(normalized),
        originalQuery: dto.q,
        intent: intentResult,
      },
    };
  }

  /**
   * Get search suggestions when no results found.
   */
  private async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      const trending = await this.trendingService.getTrending('global', '24h', 5);
      return trending.map(t => t.query);
    } catch {
      return [];
    }
  }

  private async buildResult(
    data: any[],
    total: number,
    page: number,
    limit: number,
    cacheKey: string,
    intentResult?: { intent: SearchIntent; confidence: number } | null,
  ) {
    const result = {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        cached: false,
        intent: intentResult,
      }
    };

    if (total > 0) {
      await this.redis.set(cacheKey, JSON.stringify({ ...result, meta: { ...result.meta, cached: true } }), 300);
    }

    return result;
  }

  private getSortOrder(sort: SortOption): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case SortOption.PRICE_LOW: return { price: 'asc' };
      case SortOption.PRICE_HIGH: return { price: 'desc' };
      case SortOption.NEWEST: return { createdAt: 'desc' };
      case SortOption.RATING: return { Review: { _count: 'desc' } }; // Approximate popularity
      case SortOption.RELEVANCE:
      default: return { createdAt: 'desc' }; // Default fallback
    }
  }

  // 3️⃣ Autocomplete
  async getSuggestions(query: string) {
    const normalized = this.normalizeQuery(query);
    if (normalized.length < 2) return [];

    // Cache suggestions
    const cacheKey = `search:suggest:${normalized}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Fetch titles, brands, categories
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        title: { contains: normalized, mode: 'insensitive' }
      },
      select: { title: true, Category: { select: { name: true } } },
      take: 5
    });

    const suggestions = products.map(p => ({
      text: p.title,
      type: 'PRODUCT',
      category: p.Category?.name
    }));

    await this.redis.set(cacheKey, JSON.stringify(suggestions), 600); // 10 mins
    return suggestions;
  }

  // 4️⃣ Analytics: Demand Gaps (Admin) - Enhanced
  async getDemandGaps(limit = 50) {
    return this.prisma.productSearchMiss.findMany({
      orderBy: { count: 'desc' },
      take: limit,
      select: {
        query: true,
        count: true,
        lastSearchedAt: true,
        inferredCategoryId: true,
        Category: { select: { name: true } },
      }
    });
  }

  /**
   * Get comprehensive search miss analytics for admin dashboard.
   * Includes top misses, demand gaps by category, and conversion tracking.
   */
  async getMissAnalytics(period: '24h' | '7d' | '30d' = '7d', limit: number = 50): Promise<SearchMissAnalytics> {
    const periodMs = period === '24h' ? 24 * 60 * 60 * 1000
      : period === '7d' ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - periodMs);

    // Get top missed searches
    const topMisses = await this.prisma.productSearchMiss.findMany({
      where: {
        lastSearchedAt: { gte: cutoff },
      },
      orderBy: { count: 'desc' },
      take: limit,
      include: {
        Category: { select: { name: true } },
      },
    });

    // Calculate demand gaps by category
    const categoryMisses = await this.prisma.productSearchMiss.groupBy({
      by: ['inferredCategoryId'],
      where: {
        lastSearchedAt: { gte: cutoff },
        inferredCategoryId: { not: null },
      },
      _sum: { count: true },
      _count: { id: true },
      orderBy: { _sum: { count: 'desc' } },
      take: 20,
    });

    // Get category names for the gaps
    const categoryIds = categoryMisses
      .filter(c => c.inferredCategoryId)
      .map(c => c.inferredCategoryId as string);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const demandGaps = categoryMisses.map(c => ({
      category: categoryMap.get(c.inferredCategoryId || '') || 'Unknown',
      categoryId: c.inferredCategoryId,
      missCount: c._sum.count || 0,
      uniqueQueries: c._count.id,
      // Estimate potential revenue (rough calculation based on avg order value)
      potentialRevenue: (c._sum.count || 0) * 500 * 0.15, // Assuming 15% conversion, ₹500 avg
    }));

    // Calculate summary stats
    const totalMisses = topMisses.reduce((sum, m) => sum + m.count, 0);
    const uniqueQueries = topMisses.length;
    const resolvedCount = await this.prisma.productSearchMiss.count({
      where: {
        lastSearchedAt: { gte: cutoff },
        resolved: true,
      },
    });

    return {
      topMisses: topMisses.map(m => ({
        query: m.query,
        normalizedQuery: m.normalizedQuery,
        count: m.count,
        keywords: m.keywords,
        suggestedCategory: m.Category?.name || null,
        lastSearchedAt: m.lastSearchedAt,
        resolved: m.resolved,
      })),
      demandGaps,
      summary: {
        totalMisses,
        uniqueQueries,
        resolvedCount,
        conversionRate: resolvedCount > 0 ? resolvedCount / uniqueQueries : 0,
        period,
      },
    };
  }

  /**
   * Mark a search miss as resolved (product added to catalog).
   */
  async resolveSearchMiss(missId: string, productId: string): Promise<void> {
    await this.prisma.productSearchMiss.update({
      where: { id: missId },
      data: {
        resolved: true,
        resolvedProductId: productId,
      },
    });
  }

  /**
   * Get trending searches with admin context (includes miss correlation).
   */
  async getAdminTrendingAnalytics(region: string = 'global', limit: number = 20) {
    const trending = await this.trendingService.getTrendingWithDelta(region, limit);

    // Correlate with misses
    const queries = trending.map(t => t.query);
    const missData = await this.prisma.productSearchMiss.findMany({
      where: {
        normalizedQuery: { in: queries },
      },
      select: {
        normalizedQuery: true,
        count: true,
      },
    });

    const missMap = new Map(missData.map(m => [m.normalizedQuery, m.count]));

    return trending.map(t => ({
      ...t,
      missCount: missMap.get(t.query) || 0,
      hasSupply: !missMap.has(t.query),
    }));
  }

  private async logSearchMiss(
    query: string,
    normalized: string,
    userId?: string,
    region?: string,
    keywords?: string[],
    inferredCategoryId?: string | null,
  ) {
    // De-duplicate logic: Find recent miss with same normalized query
    const recent = await this.prisma.productSearchMiss.findFirst({
      where: {
        normalizedQuery: normalized,
        lastSearchedAt: { gte: new Date(Date.now() - 3600 * 1000) } // Within last hour
      }
    });

    if (recent) {
      await this.prisma.productSearchMiss.update({
        where: { id: recent.id },
        data: {
          count: { increment: 1 },
          // Update category if we now have better inference
          inferredCategoryId: inferredCategoryId || recent.inferredCategoryId,
        }
      });
    } else {
      await this.prisma.productSearchMiss.create({
        data: {
          id: randomUUID(),
          query,
          normalizedQuery: normalized,
          userId,
          region,
          count: 1,
          keywords: keywords || normalized.split(' '),
          inferredCategoryId,
          lastSearchedAt: new Date(),
        }
      });
    }

    this.logger.debug(`Logged search miss: "${query}" (normalized: "${normalized}")`);
  }

  // 5️⃣ Region-Based Trending Search
  async logSearchTrend(query: string, region: string = 'global') {
    const normalized = this.normalizeQuery(query);
    if (!normalized) return;

    const key = `search:trend:${region.toLowerCase()}`;
    // Increment score in Redis Sorted Set
    // Score logic: Simple increment for now. 
    // Decay is handled by periodic cleanup or using a "Time Window" bucket approach (e.g., search:trend:region:date).
    // For simplicity: We just increment. 
    // Real-world: Use sliding window or ZINCRBY + distinct job to decay OLD scores.

    await this.redis.zincrby(key, 1, normalized);

    // Also log to global
    if (region !== 'global') {
      await this.redis.zincrby('search:trend:global', 1, normalized);
    }
  }

  async getTrendingSearches(region: string = 'global', limit: number = 10) {
    const key = `search:trend:${region.toLowerCase()}`;
    // Get top queries with scores
    const trends = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');

    // Format: [query, score, query, score...] flat array from Redis -> Object array
    const result = [];
    for (let i = 0; i < trends.length; i += 2) {
      result.push({ query: trends[i], score: Number(trends[i + 1]) });
    }
    return result;
  }

  // 6️⃣ Bulk Sync (Admin)
  async syncAllProducts() {
    this.logger.log('Starting bulk sync of all active products...');
    const batchSize = 100;
    let page = 0;
    let count = 0;

    while (true) {
      const products = await this.prisma.product.findMany({
        where: { isActive: true },
        take: batchSize,
        skip: page * batchSize,
        include: {
          Vendor: { select: { name: true, performanceScore: true } },
          Category: { select: { name: true } }
        }
      });

      if (products.length === 0) break;

      const jobs = products.map(p => ({
        name: 'index-product',
        data: {
          id: p.id,
          name: p.title,
          description: p.description,
          price: p.price,
          category: p.Category?.name,
          vendor: p.Vendor?.name,
          popularityScore: p.popularityScore || 0,
          createdAt: p.createdAt
        }
      }));

      await this.searchSyncQueue.addBulk(jobs);
      count += products.length;
      page++;
      this.logger.log(`Queued ${count} products for sync...`);
    }

    return { message: `Queued ${count} products for synchronization` };
  }

  async indexProduct(product: any) {
    await this.searchSyncQueue.add('index-product', product);
  }

  async removeProduct(productId: string) {
    await this.searchSyncQueue.add('delete-product', { id: productId });
  }

  private async searchElasticsearch(dto: SearchQueryDto) {
    const { q, categoryId, minPrice, maxPrice, page = 1, limit = 20 } = dto;
    const from = (page - 1) * limit;

    const must: any[] = [];
    const query = this.normalizeQuery(q);

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['name^3', 'description', 'category', 'vendor'],
          fuzziness: 'AUTO'
        }
      });
    }
    // Note: Elasticsearch mapping should expect 'category' as keyword if exact match
    // or we index categoryId. For now assuming category name or ID is indexed.
    // Sync processor maps 'category' to product.category.name (string).
    // So we should search by category name if categoryId is provided? 
    // Or we should update sync processor to index categoryId.
    // Let's assume for now we skip categoryId exact filter in ES or map it.
    // Ideally we index categoryId.
    // Let's rely on text search mostly for now for ES phase 1.

    if (minPrice || maxPrice) {
      must.push({ range: { price: { gte: minPrice, lte: maxPrice } } });
    }

    // If no query and no filters, match all (or rely on DB fallback for empty search?)
    if (must.length === 0) {
      return null; // Fallback to DB for "all products" browsing or handle match_all
    }

    const { hits } = await this.elasticsearchService.search({
      index: 'products_v1',
      query: { bool: { must } },
      from,
      size: limit,
      sort: dto.sort === SortOption.PRICE_LOW ? [{ price: { order: 'asc' } }] :
        dto.sort === SortOption.PRICE_HIGH ? [{ price: { order: 'desc' } }] :
          dto.sort === SortOption.RELEVANCE ? [{ _score: { order: 'desc' } }, { popularityScore: { order: 'desc' } }] :
            [{ _score: { order: 'desc' } }] // Default
    });

    const total = typeof hits.total === 'number' ? hits.total : hits.total['value'];
    if (total === 0) return null; // Let DB fallback handle it or return empty? 
    // If ES has 0, DB likely 0 too. But let's return results.

    const products = hits.hits.map(hit => hit._source);

    return {
      data: products,
      meta: { total, page, lastPage: Math.ceil(total / limit), source: 'elasticsearch' }
    };
  }
}

// Type definitions for analytics
export interface SearchMissAnalytics {
  topMisses: {
    query: string;
    normalizedQuery: string;
    count: number;
    keywords: string[];
    suggestedCategory: string | null;
    lastSearchedAt: Date;
    resolved: boolean;
  }[];
  demandGaps: {
    category: string;
    categoryId: string | null;
    missCount: number;
    uniqueQueries: number;
    potentialRevenue: number;
  }[];
  summary: {
    totalMisses: number;
    uniqueQueries: number;
    resolvedCount: number;
    conversionRate: number;
    period: string;
  };
}
