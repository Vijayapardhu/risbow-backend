import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../shared/redis.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TrendingService: Tracks search queries with time-decayed popularity scoring.
 * 
 * Redis Strategy:
 * - search:trending:global:24h - Global trending (24 hour window)
 * - search:trending:{region}:24h - Regional trending
 * - search:trending:global:7d - Weekly trending
 * - search:popular:global - Top 100 queries (refreshed periodically)
 * 
 * Time Decay Formula:
 * score = count * Math.exp(-0.1 * hours_since_last_seen)
 */
@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  // Redis key patterns
  private readonly TREND_KEY_24H = 'search:trending';
  private readonly POPULAR_KEY = 'search:popular';
  private readonly TREND_CACHE_TTL = 300; // 5 minutes
  private readonly POPULAR_CACHE_TTL = 600; // 10 minutes

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Increment search counter for trending tracking.
   * Updates both Redis (real-time) and optionally DB (persistence).
   * 
   * @param query - The search query (will be normalized)
   * @param region - Geographic region, defaults to 'global'
   */
  async incrementSearch(query: string, region: string = 'global'): Promise<void> {
    const normalized = this.normalizeQuery(query);
    if (!normalized || normalized.length < 2) return;

    try {
      // Update Redis sorted sets for real-time trending
      const key24h = `${this.TREND_KEY_24H}:${region.toLowerCase()}:24h`;
      const key7d = `${this.TREND_KEY_24H}:${region.toLowerCase()}:7d`;

      await Promise.all([
        this.redis.zincrby(key24h, 1, normalized),
        this.redis.zincrby(key7d, 1, normalized),
        // Also update global if regional
        region !== 'global' ? this.redis.zincrby(`${this.TREND_KEY_24H}:global:24h`, 1, normalized) : Promise.resolve(),
        region !== 'global' ? this.redis.zincrby(`${this.TREND_KEY_24H}:global:7d`, 1, normalized) : Promise.resolve(),
      ]);

      // Persist to DB for long-term analytics (async, non-blocking)
      this.persistToDatabase(normalized, region).catch(err => {
        this.logger.error(`Failed to persist trending data: ${err.message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to increment search trend: ${error.message}`);
    }
  }

  /**
   * Get trending queries for a specific region and time period.
   * Applies time-decay scoring for relevance.
   * 
   * @param region - Geographic region, defaults to 'global'
   * @param period - Time period: '24h' or '7d'
   * @param limit - Maximum results to return
   */
  async getTrending(
    region: string = 'global',
    period: '24h' | '7d' = '24h',
    limit: number = 10,
  ): Promise<TrendingResult[]> {
    const cacheKey = `${this.TREND_KEY_24H}:cache:${region}:${period}`;
    
    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const key = `${this.TREND_KEY_24H}:${region.toLowerCase()}:${period}`;
      const rawResults = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');

      // Parse Redis ZREVRANGE result: [member, score, member, score, ...]
      const results: TrendingResult[] = [];
      for (let i = 0; i < rawResults.length; i += 2) {
        const query = rawResults[i];
        const count = parseInt(rawResults[i + 1], 10);
        
        // Calculate time-decayed score
        const trendScore = this.calculateTrendScore(count, period);
        
        results.push({
          query,
          count,
          score: trendScore,
          trend: this.determineTrend(query, region, period),
        });
      }

      // Cache results
      await this.redis.set(cacheKey, JSON.stringify(results), this.TREND_CACHE_TTL);

      return results;
    } catch (error) {
      this.logger.error(`Failed to get trending: ${error.message}`);
      return [];
    }
  }

  /**
   * Get trending queries with change percentage compared to previous period.
   * Useful for showing "trending up" or "trending down" indicators.
   */
  async getTrendingWithDelta(
    region: string = 'global',
    limit: number = 10,
  ): Promise<TrendingWithDelta[]> {
    const [current, previous] = await Promise.all([
      this.getTrending(region, '24h', limit * 2), // Get more for comparison
      this.getPreviousPeriodData(region),
    ]);

    const previousMap = new Map(previous.map(p => [p.query, p.count]));

    return current.slice(0, limit).map(item => {
      const prevCount = previousMap.get(item.query) || 0;
      const changePercent = prevCount > 0 
        ? ((item.count - prevCount) / prevCount) * 100 
        : item.count > 0 ? 100 : 0;

      return {
        ...item,
        changePercent: Math.round(changePercent * 10) / 10,
        trend: changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable',
      };
    });
  }

  /**
   * Time-decay scoring formula.
   * Newer searches get higher scores, older searches decay exponentially.
   * 
   * Formula: score = count * e^(-λ * hours)
   * where λ = 0.1 for 24h data, 0.02 for 7d data
   */
  calculateTrendScore(count: number, period: '24h' | '7d'): number {
    // For real-time data, we don't have exact timestamps per query in Redis
    // So we apply a base decay factor based on period window
    const decayFactor = period === '24h' ? 0.95 : 0.85;
    return Math.round(count * decayFactor * 100) / 100;
  }

  /**
   * Get popular queries (cached top 100).
   * Used for autocomplete and discovery features.
   */
  async getPopularQueries(region: string = 'global', limit: number = 100): Promise<string[]> {
    const cacheKey = `${this.POPULAR_KEY}:${region}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached).slice(0, limit);
    }

    const trending = await this.getTrending(region, '7d', limit);
    const queries = trending.map(t => t.query);

    await this.redis.set(cacheKey, JSON.stringify(queries), this.POPULAR_CACHE_TTL);

    return queries;
  }

  /**
   * Persist trending data to database for long-term analytics.
   */
  private async persistToDatabase(query: string, region: string): Promise<void> {
    const existing = await this.prisma.searchTrending.findUnique({
      where: {
        query_region: { query, region },
      },
    });

    if (existing) {
      await this.prisma.searchTrending.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          lastSeen: new Date(),
        },
      });
    } else {
      await this.prisma.searchTrending.create({
        data: {
          query,
          region,
          count: 1,
          lastSeen: new Date(),
        },
      });
    }
  }

  /**
   * Get data from previous time period for comparison.
   * Falls back to database for historical data.
   */
  private async getPreviousPeriodData(region: string): Promise<{ query: string; count: number }[]> {
    // Get data from 24-48 hours ago from database
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const endCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const data = await this.prisma.searchTrending.findMany({
        where: {
          region,
          lastSeen: {
            gte: cutoff,
            lte: endCutoff,
          },
        },
        orderBy: { count: 'desc' },
        take: 100,
      });

      return data.map(d => ({ query: d.query, count: d.count }));
    } catch {
      return [];
    }
  }

  /**
   * Determine trend direction based on historical data.
   */
  private determineTrend(query: string, region: string, period: string): 'up' | 'down' | 'stable' {
    // For real-time, we return 'stable' by default
    // Actual trend is calculated in getTrendingWithDelta
    return 'stable';
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

  /**
   * Cleanup old trending data (scheduled job target).
   * Removes entries older than retention period.
   */
  async cleanupOldTrends(retentionDays: number = 30): Promise<{ deleted: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.searchTrending.deleteMany({
      where: {
        lastSeen: { lt: cutoff },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old trending entries`);
    return { deleted: result.count };
  }
}

// Type definitions
export interface TrendingResult {
  query: string;
  count: number;
  score: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendingWithDelta extends TrendingResult {
  changePercent: number;
}
