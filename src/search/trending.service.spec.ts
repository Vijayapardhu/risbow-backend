import { Test, TestingModule } from '@nestjs/testing';
import { TrendingService, TrendingResult } from './trending.service';
import { RedisService } from '../shared/redis.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TrendingService', () => {
  let service: TrendingService;
  let redisService: jest.Mocked<RedisService>;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockRedisService = {
      zincrby: jest.fn().mockResolvedValue('1'),
      zrevrange: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    const mockPrismaService = {
      searchTrending: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'test-id' }),
        update: jest.fn().mockResolvedValue({ id: 'test-id' }),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendingService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TrendingService>(TrendingService);
    redisService = module.get(RedisService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('incrementSearch', () => {
    it('should increment Redis counters for valid query', async () => {
      await service.incrementSearch('iphone 15', 'global');

      expect(redisService.zincrby).toHaveBeenCalledWith(
        'search:trending:global:24h',
        1,
        'iphone 15'
      );
      expect(redisService.zincrby).toHaveBeenCalledWith(
        'search:trending:global:7d',
        1,
        'iphone 15'
      );
    });

    it('should increment both global and regional counters for regional query', async () => {
      await service.incrementSearch('samsung galaxy', 'mumbai');

      // Should increment regional
      expect(redisService.zincrby).toHaveBeenCalledWith(
        'search:trending:mumbai:24h',
        1,
        'samsung galaxy'
      );
      // Should also increment global
      expect(redisService.zincrby).toHaveBeenCalledWith(
        'search:trending:global:24h',
        1,
        'samsung galaxy'
      );
    });

    it('should not increment for very short queries', async () => {
      await service.incrementSearch('a', 'global');
      expect(redisService.zincrby).not.toHaveBeenCalled();
    });

    it('should normalize query before incrementing', async () => {
      await service.incrementSearch('  IPHONE 15!!!  ', 'global');

      expect(redisService.zincrby).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'iphone 15'
      );
    });
  });

  describe('getTrending', () => {
    it('should return cached results if available', async () => {
      const cachedResults: TrendingResult[] = [
        { query: 'iphone', count: 100, score: 95, trend: 'up' },
      ];
      redisService.get.mockResolvedValueOnce(JSON.stringify(cachedResults));

      const result = await service.getTrending('global', '24h', 10);

      expect(result).toEqual(cachedResults);
      expect(redisService.zrevrange).not.toHaveBeenCalled();
    });

    it('should fetch from Redis and cache results', async () => {
      redisService.zrevrange.mockResolvedValueOnce(['iphone', '100', 'samsung', '80']);

      const result = await service.getTrending('global', '24h', 10);

      expect(result).toHaveLength(2);
      expect(result[0].query).toBe('iphone');
      expect(result[0].count).toBe(100);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      redisService.zrevrange.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.getTrending('global', '24h', 10);

      expect(result).toEqual([]);
    });
  });

  describe('calculateTrendScore', () => {
    it('should apply decay factor for 24h period', () => {
      const score = service.calculateTrendScore(100, '24h');
      expect(score).toBe(95); // 100 * 0.95
    });

    it('should apply higher decay for 7d period', () => {
      const score = service.calculateTrendScore(100, '7d');
      expect(score).toBe(85); // 100 * 0.85
    });
  });

  describe('getPopularQueries', () => {
    it('should return cached popular queries', async () => {
      redisService.get.mockResolvedValueOnce(JSON.stringify(['iphone', 'samsung']));

      const result = await service.getPopularQueries('global', 10);

      expect(result).toEqual(['iphone', 'samsung']);
    });
  });

  describe('cleanupOldTrends', () => {
    it('should delete old trending data', async () => {
      (prismaService.searchTrending.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 5 });

      const result = await service.cleanupOldTrends(30);

      expect(result).toEqual({ deleted: 5 });
      expect(prismaService.searchTrending.deleteMany).toHaveBeenCalledWith({
        where: {
          lastSeen: { lt: expect.any(Date) },
        },
      });
    });
  });
});
