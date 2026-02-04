import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../shared/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { TrendingService } from './trending.service';

/**
 * AutocompleteService: Provides intelligent search suggestions.
 * 
 * Strategy:
 * 1. Prefix-based suggestions from product titles
 * 2. Popular/trending query suggestions
 * 3. Category-aware suggestions
 * 4. Redis-cached results for performance
 * 
 * Redis Keys:
 * - search:autocomplete:{prefix} - Cached prefix suggestions (TTL: 10 mins)
 */
@Injectable()
export class AutocompleteService {
  private readonly logger = new Logger(AutocompleteService.name);

  private readonly AUTOCOMPLETE_KEY = 'search:autocomplete';
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly MIN_QUERY_LENGTH = 2;
  private readonly MAX_SUGGESTIONS = 10;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly trendingService: TrendingService,
  ) {}

  /**
   * Get autocomplete suggestions for a search prefix.
   * Combines product matches, trending queries, and categories.
   * 
   * @param prefix - User's partial search input
   * @param limit - Maximum suggestions to return
   * @param region - Geographic region for trending bias
   */
  async getSuggestions(
    prefix: string,
    limit: number = this.MAX_SUGGESTIONS,
    region: string = 'global',
  ): Promise<AutocompleteSuggestion[]> {
    const normalized = this.normalizeQuery(prefix);
    
    if (normalized.length < this.MIN_QUERY_LENGTH) {
      // For very short queries, return popular searches
      return this.getPopularSuggestions(limit, region);
    }

    // Check cache first
    const cacheKey = `${this.AUTOCOMPLETE_KEY}:${normalized}:${region}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch suggestions from multiple sources in parallel
    const [productSuggestions, trendingSuggestions, categorySuggestions] = await Promise.all([
      this.getProductSuggestions(normalized, Math.ceil(limit / 2)),
      this.getTrendingSuggestions(normalized, Math.ceil(limit / 3), region),
      this.getCategorySuggestions(normalized, 3),
    ]);

    // Merge and deduplicate, prioritizing by type and relevance
    const suggestions = this.mergeSuggestions(
      productSuggestions,
      trendingSuggestions,
      categorySuggestions,
      limit,
    );

    // Cache results
    await this.redis.set(cacheKey, JSON.stringify(suggestions), this.CACHE_TTL);

    return suggestions;
  }

  /**
   * Get suggestions from product titles.
   */
  private async getProductSuggestions(
    prefix: string,
    limit: number,
  ): Promise<AutocompleteSuggestion[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          isActive: true,
          title: { contains: prefix, mode: 'insensitive' },
        },
        select: {
          title: true,
          brandName: true,
          Category: { select: { name: true } },
        },
        orderBy: { popularityScore: 'desc' },
        take: limit,
      });

      return products.map(p => ({
        text: p.title,
        type: 'product' as const,
        category: p.Category?.name,
        brand: p.brandName,
        priority: 100, // High priority for direct product matches
      }));
    } catch (error) {
      this.logger.error(`Product suggestions failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get suggestions from trending searches.
   */
  private async getTrendingSuggestions(
    prefix: string,
    limit: number,
    region: string,
  ): Promise<AutocompleteSuggestion[]> {
    try {
      const trending = await this.trendingService.getPopularQueries(region, 100);
      
      // Filter by prefix match
      const matching = trending
        .filter(q => q.toLowerCase().startsWith(prefix.toLowerCase()))
        .slice(0, limit);

      return matching.map(q => ({
        text: q,
        type: 'trending' as const,
        priority: 80, // Medium-high priority for trending matches
      }));
    } catch (error) {
      this.logger.error(`Trending suggestions failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get suggestions from category names.
   */
  private async getCategorySuggestions(
    prefix: string,
    limit: number,
  ): Promise<AutocompleteSuggestion[]> {
    try {
      const categories = await this.prisma.category.findMany({
        where: {
          isActive: true,
          name: { contains: prefix, mode: 'insensitive' },
        },
        select: { name: true, Category: { select: { name: true } } },
        take: limit,
      });

      return categories.map(c => ({
        text: c.name,
        type: 'category' as const,
        parentCategory: c.Category?.name,
        priority: 90, // High priority for category matches
      }));
    } catch (error) {
      this.logger.error(`Category suggestions failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get popular suggestions when query is too short.
   */
  private async getPopularSuggestions(
    limit: number,
    region: string,
  ): Promise<AutocompleteSuggestion[]> {
    const cacheKey = `${this.AUTOCOMPLETE_KEY}:popular:${region}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached).slice(0, limit);
    }

    try {
      const trending = await this.trendingService.getTrending(region, '24h', limit);
      
      const suggestions = trending.map(t => ({
        text: t.query,
        type: 'popular' as const,
        priority: 70 + (t.score / 10), // Priority based on trend score
      }));

      await this.redis.set(cacheKey, JSON.stringify(suggestions), this.CACHE_TTL);
      return suggestions;
    } catch (error) {
      this.logger.error(`Popular suggestions failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Merge suggestions from multiple sources, deduplicate, and sort by priority.
   */
  private mergeSuggestions(
    products: AutocompleteSuggestion[],
    trending: AutocompleteSuggestion[],
    categories: AutocompleteSuggestion[],
    limit: number,
  ): AutocompleteSuggestion[] {
    const seen = new Set<string>();
    const merged: AutocompleteSuggestion[] = [];

    // Helper to add unique suggestions
    const addUnique = (suggestions: AutocompleteSuggestion[]) => {
      for (const s of suggestions) {
        const key = s.text.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(s);
        }
      }
    };

    // Add in priority order: products first, then categories, then trending
    addUnique(products);
    addUnique(categories);
    addUnique(trending);

    // Sort by priority and limit
    return merged
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, limit)
      .map(({ priority, ...rest }) => rest); // Remove internal priority field
  }

  /**
   * Refresh autocomplete cache for popular prefixes.
   * Should be run periodically to keep suggestions fresh.
   */
  async refreshPopularPrefixes(): Promise<void> {
    const popularQueries = await this.trendingService.getPopularQueries('global', 50);
    
    for (const query of popularQueries) {
      // Pre-cache suggestions for common prefixes (first 3 chars)
      if (query.length >= 3) {
        const prefix = query.slice(0, 3);
        await this.getSuggestions(prefix, 10, 'global');
      }
    }

    this.logger.log(`Refreshed autocomplete cache for ${popularQueries.length} popular prefixes`);
  }

  /**
   * Normalize query string for consistent matching.
   */
  private normalizeQuery(query: string): string {
    if (!query) return '';
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');
  }
}

// Type definitions
export interface AutocompleteSuggestion {
  text: string;
  type: 'product' | 'category' | 'trending' | 'popular';
  category?: string;
  parentCategory?: string;
  brand?: string;
  priority?: number;
}
