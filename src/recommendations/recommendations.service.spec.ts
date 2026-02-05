import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  const mockPrismaService = {
    userProductInteraction: {
      findMany: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    productSimilarity: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    zincrby: jest.fn(),
    expire: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have correct cache TTL', () => {
    expect(service['CACHE_TTL']).toBe(3600);
  });

  it('should have correct max recommendations limit', () => {
    expect(service['MAX_RECOMMENDATIONS']).toBe(20);
  });

  describe('Service methods', () => {
    it('should have getPersonalizedRecommendations method', () => {
      expect(service.getPersonalizedRecommendations).toBeDefined();
      expect(typeof service.getPersonalizedRecommendations).toBe('function');
    });

    it('should have getSimilarProducts method', () => {
      expect(service.getSimilarProducts).toBeDefined();
      expect(typeof service.getSimilarProducts).toBe('function');
    });

    it('should have getTrendingProducts method', () => {
      expect(service.getTrendingProducts).toBeDefined();
      expect(typeof service.getTrendingProducts).toBe('function');
    });

    it('should have getFrequentlyBoughtTogether method', () => {
      expect(service.getFrequentlyBoughtTogether).toBeDefined();
      expect(typeof service.getFrequentlyBoughtTogether).toBe('function');
    });

    it('should have trackInteraction method', () => {
      expect(service.trackInteraction).toBeDefined();
      expect(typeof service.trackInteraction).toBe('function');
    });

    it('should have calculateProductSimilarities cron method', () => {
      expect(service.calculateProductSimilarities).toBeDefined();
      expect(typeof service.calculateProductSimilarities).toBe('function');
    });
  });
});
