import { Test, TestingModule } from '@nestjs/testing';
import { AutocompleteService, AutocompleteSuggestion } from './autocomplete.service';
import { RedisService } from '../shared/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { TrendingService } from './trending.service';

describe('AutocompleteService', () => {
  let service: AutocompleteService;
  let redisService: jest.Mocked<RedisService>;
  let prismaService: jest.Mocked<PrismaService>;
  let trendingService: jest.Mocked<TrendingService>;

  beforeEach(async () => {
    const mockRedisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    const mockPrismaService = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockTrendingService = {
      getPopularQueries: jest.fn().mockResolvedValue([]),
      getTrending: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutocompleteService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TrendingService, useValue: mockTrendingService },
      ],
    }).compile();

    service = module.get<AutocompleteService>(AutocompleteService);
    redisService = module.get(RedisService);
    prismaService = module.get(PrismaService);
    trendingService = module.get(TrendingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSuggestions', () => {
    it('should return popular suggestions for short queries', async () => {
      trendingService.getTrending.mockResolvedValueOnce([
        { query: 'iphone', count: 100, score: 95, trend: 'up' as const },
        { query: 'samsung', count: 80, score: 76, trend: 'stable' as const },
      ]);

      const result = await service.getSuggestions('a', 10, 'global');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('popular');
    });

    it('should return cached results if available', async () => {
      const cachedSuggestions: AutocompleteSuggestion[] = [
        { text: 'iphone 15', type: 'product', category: 'smartphones' },
      ];
      redisService.get.mockResolvedValueOnce(JSON.stringify(cachedSuggestions));

      const result = await service.getSuggestions('iphone', 10, 'global');

      expect(result).toEqual(cachedSuggestions);
      expect(prismaService.product.findMany).not.toHaveBeenCalled();
    });

    it('should merge product, category, and trending suggestions', async () => {
      // Mock product suggestions
      (prismaService.product.findMany as jest.Mock).mockResolvedValueOnce([
        { title: 'iPhone 15 Pro', brandName: 'Apple', category: { name: 'Smartphones' } },
      ]);

      // Mock category suggestions
      (prismaService.category.findMany as jest.Mock).mockResolvedValueOnce([
        { name: 'Smartphones', parent: null },
      ]);

      // Mock trending suggestions
      trendingService.getPopularQueries.mockResolvedValueOnce(['iphone 15', 'iphone case']);

      const result = await service.getSuggestions('iphone', 10, 'global');

      expect(result.length).toBeGreaterThan(0);
      expect(redisService.set).toHaveBeenCalled(); // Should cache results
    });

    it('should deduplicate suggestions', async () => {
      // Mock same text from different sources
      (prismaService.product.findMany as jest.Mock).mockResolvedValueOnce([
        { title: 'iPhone 15', brandName: 'Apple', category: { name: 'Smartphones' } },
      ]);

      (prismaService.category.findMany as jest.Mock).mockResolvedValueOnce([]);

      trendingService.getPopularQueries.mockResolvedValueOnce(['iphone 15']); // Same as product

      const result = await service.getSuggestions('iphone', 10, 'global');

      // Should not have duplicates
      const texts = result.map(r => r.text.toLowerCase());
      const uniqueTexts = [...new Set(texts)];
      expect(texts.length).toBe(uniqueTexts.length);
    });

    it('should normalize query before searching', async () => {
      await service.getSuggestions('  IPHONE!!!  ', 10, 'global');

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'iphone', mode: 'insensitive' },
          }),
        })
      );
    });
  });

  describe('getPopularSuggestions', () => {
    it('should return cached popular suggestions', async () => {
      const cached = [{ text: 'iphone', type: 'popular', priority: 80 }];
      redisService.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.getSuggestions('a', 5, 'global');

      expect(result.length).toBeGreaterThan(0);
    });

    it('should fetch from trending service when cache miss', async () => {
      trendingService.getTrending.mockResolvedValueOnce([
        { query: 'trending item', count: 50, score: 47.5, trend: 'up' as const },
      ]);

      const result = await service.getSuggestions('a', 5, 'global');

      expect(trendingService.getTrending).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return empty array on product fetch error', async () => {
      (prismaService.product.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      (prismaService.category.findMany as jest.Mock).mockResolvedValueOnce([]);
      trendingService.getPopularQueries.mockResolvedValueOnce([]);

      const result = await service.getSuggestions('test', 10, 'global');

      expect(result).toEqual([]);
    });

    it('should return empty array on trending fetch error', async () => {
      trendingService.getTrending.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.getSuggestions('a', 5, 'global');

      expect(result).toEqual([]);
    });
  });
});
