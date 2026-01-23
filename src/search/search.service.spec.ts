import { Test, TestingModule } from '@nestjs/testing';
import { SearchService, SearchIntent } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { BowRecommendationEngine } from '../bow/bow-recommendation.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { getQueueToken } from '@nestjs/bullmq';
import { TrendingService } from './trending.service';

describe('SearchService', () => {
  let service: SearchService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let trendingService: jest.Mocked<TrendingService>;

  beforeEach(async () => {
    const mockPrismaService = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      productSearchMiss: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'test-id' }),
        update: jest.fn().mockResolvedValue({ id: 'test-id' }),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      category: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockRedisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      zincrby: jest.fn().mockResolvedValue('1'),
      zrevrange: jest.fn().mockResolvedValue([]),
    };

    const mockBowRecommendation = {
      getSmartRecommendations: jest.fn().mockResolvedValue([]),
    };

    const mockElasticsearch = {
      search: jest.fn().mockResolvedValue({ hits: { total: 0, hits: [] } }),
    };

    const mockQueue = {
      add: jest.fn().mockResolvedValue({}),
      addBulk: jest.fn().mockResolvedValue([]),
    };

    const mockTrendingService = {
      incrementSearch: jest.fn().mockResolvedValue(undefined),
      getTrending: jest.fn().mockResolvedValue([]),
      getTrendingWithDelta: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: BowRecommendationEngine, useValue: mockBowRecommendation },
        { provide: ElasticsearchService, useValue: mockElasticsearch },
        { provide: getQueueToken('search-sync'), useValue: mockQueue },
        { provide: TrendingService, useValue: mockTrendingService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    trendingService = module.get(TrendingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectIntent', () => {
    it('should detect transactional intent for specific product queries', () => {
      const result = service.detectIntent('iphone 15 pro 256gb');
      
      expect(result.intent).toBe(SearchIntent.TRANSACTIONAL);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect exploratory intent for general queries', () => {
      const result = service.detectIntent('best phones under 20000');
      
      expect(result.intent).toBe(SearchIntent.EXPLORATORY);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect exploratory intent for queries with discount keywords', () => {
      const result = service.detectIntent('cheap laptops');
      
      expect(result.intent).toBe(SearchIntent.EXPLORATORY);
    });

    it('should detect transactional for brand + model queries', () => {
      const result = service.detectIntent('samsung galaxy s24');
      
      expect(result.intent).toBe(SearchIntent.TRANSACTIONAL);
    });

    it('should handle empty queries', () => {
      const result = service.detectIntent('');
      
      // Empty query defaults to exploratory with low confidence
      expect(result.intent).toBe(SearchIntent.EXPLORATORY);
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });
  });

  describe('extractKeywords', () => {
    it('should extract meaningful keywords', () => {
      const keywords = service.extractKeywords('the best iphone 15 for gaming');
      
      expect(keywords).toContain('best');
      expect(keywords).toContain('iphone');
      expect(keywords).toContain('gaming');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('for');
    });

    it('should filter stop words', () => {
      const keywords = service.extractKeywords('a phone with great camera');
      
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('with');
      expect(keywords).toContain('phone');
      expect(keywords).toContain('great');
      expect(keywords).toContain('camera');
    });

    it('should normalize and extract', () => {
      const keywords = service.extractKeywords('  AMAZING   Phone!!!  ');
      
      expect(keywords).toContain('amazing');
      expect(keywords).toContain('phone');
    });
  });

  describe('suggestCategory', () => {
    it('should suggest category for phone-related keywords', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Smartphones',
      });

      const result = await service.suggestCategory(['iphone', 'mobile']);

      expect(result.categoryName).toBe('Smartphones');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return null for unrecognized keywords', async () => {
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.suggestCategory(['xyz123', 'random']);

      expect(result.categoryId).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  describe('searchProducts', () => {
    it('should return cached results when available', async () => {
      const cachedResult = {
        data: [{ id: '1', title: 'Test Product' }],
        meta: { total: 1, page: 1, lastPage: 1, cached: true },
      };
      redisService.get.mockResolvedValueOnce(JSON.stringify(cachedResult));

      const result = await service.searchProducts({ q: 'test' }, 'user-1');

      expect(result).toEqual(cachedResult);
      expect(prismaService.product.findMany).not.toHaveBeenCalled();
    });

    it('should track trending for successful searches', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValueOnce([
        { id: '1', title: 'Test Product', tags: [], stock: 10 },
      ]);
      (prismaService.product.count as jest.Mock).mockResolvedValueOnce(1);

      await service.searchProducts({ q: 'test product' }, 'user-1', 'global');

      // Wait for async trending increment
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(trendingService.incrementSearch).toHaveBeenCalledWith(
        'test product',
        'global'
      );
    });

    it('should handle zero results with fallback', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.category.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.searchProducts({ q: 'nonexistent product' }, 'user-1');

      expect(result.meta.fallback).toBeDefined();
      expect(result.meta.originalQuery).toBe('nonexistent product');
    });
  });

  describe('getMissAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      (prismaService.productSearchMiss.findMany as jest.Mock).mockResolvedValueOnce([
        {
          query: 'test query',
          normalizedQuery: 'test query',
          count: 10,
          keywords: ['test', 'query'],
          resolved: false,
          lastSearchedAt: new Date(),
          category: { name: 'Electronics' },
        },
      ]);
      (prismaService.productSearchMiss.groupBy as jest.Mock).mockResolvedValueOnce([]);
      (prismaService.category.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prismaService.productSearchMiss.count as jest.Mock).mockResolvedValueOnce(5);

      const result = await service.getMissAnalytics('7d', 50);

      expect(result.topMisses).toBeDefined();
      expect(result.demandGaps).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.period).toBe('7d');
    });
  });

  describe('resolveSearchMiss', () => {
    it('should mark miss as resolved', async () => {
      await service.resolveSearchMiss('miss-1', 'product-1');

      expect(prismaService.productSearchMiss.update).toHaveBeenCalledWith({
        where: { id: 'miss-1' },
        data: {
          resolved: true,
          resolvedProductId: 'product-1',
        },
      });
    });
  });

  describe('getDemandGaps', () => {
    it('should return top search misses', async () => {
      const mockMisses = [
        { query: 'missing product', count: 100, lastSearchedAt: new Date() },
      ];
      (prismaService.productSearchMiss.findMany as jest.Mock).mockResolvedValueOnce(mockMisses);

      const result = await service.getDemandGaps(10);

      expect(result).toEqual(mockMisses);
      expect(prismaService.productSearchMiss.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { count: 'desc' },
          take: 10,
        })
      );
    });
  });
});
