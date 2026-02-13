import { Test, TestingModule } from '@nestjs/testing';
import { CartIntelligenceService } from './cart-intelligence.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';

describe('CartIntelligenceService', () => {
  let service: CartIntelligenceService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    cart: {
      findUnique: jest.fn(),
    },
    cartInsight: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    bowActionLog: {
      findMany: jest.fn(),
    },
    room: {
      findMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    setex: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartIntelligenceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<CartIntelligenceService>(CartIntelligenceService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeCart', () => {
    it('should return empty signals for empty cart', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      const result = await service.analyzeCart('user-1');

      expect(result).toEqual([]);
    });

    it('should detect hesitation signals', async () => {
      const mockCart = {
        items: [{ quantity: 1, product: { categoryId: 'cat1', price: 10000, offerPrice: null } }],
      };
      const mockLastInsight = {
        triggeredAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartInsight.findFirst.mockResolvedValue(mockLastInsight);

      const result = await service.analyzeCart('user-1');

      expect(result.some(signal => signal.type === 'HESITATION')).toBe(true);
    });

    it('should detect threshold near signals', async () => {
      const mockCart = {
        items: [
          {
            productId: 'p1',
            quantity: 1,
            product: { categoryId: 'cat1', price: 95000, offerPrice: null },
          },
        ], // ₹950
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartInsight.findFirst.mockResolvedValue(null);

      const result = await service.analyzeCart('user-1');

      expect(result.some(signal => signal.type === 'THRESHOLD_NEAR')).toBe(true);
    });

    it('should detect bundle opportunity for single item cart', async () => {
      const mockCart = {
        items: [
          {
            productId: 'p1',
            quantity: 1,
            product: { categoryId: 'cat1', price: 10000, offerPrice: null },
          },
        ],
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartInsight.findFirst.mockResolvedValue(null);

      const result = await service.analyzeCart('user-1');

      expect(result.some(signal => signal.type === 'BUNDLE_OPPORTUNITY')).toBe(true);
    });
  });

  describe('detectHesitation', () => {
    it('should return hesitation signal for idle cart', async () => {
      const mockCart = { items: [] };
      const mockLastInsight = {
        triggeredAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      };

      mockPrismaService.cartInsight.findFirst.mockResolvedValue(mockLastInsight);

      const result = await (service as any).detectHesitation('user-1', mockCart);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('HESITATION');
      expect(result[0].severity).toBe('LOW');
    });
  });

  describe('detectThresholdNear', () => {
    it('should detect free shipping threshold', () => {
      const result = (service as any).detectThresholdNear(95000); // ₹950

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('THRESHOLD_NEAR');
      expect(result[0].metadata.threshold).toBe(100000); // ₹1000
    });

    it('should detect gift eligibility threshold', () => {
      const result = (service as any).detectThresholdNear(195000); // ₹1950

      expect(result.some((signal: any) => signal.metadata.threshold === 200000)).toBe(true); // ₹2000
    });
  });

  describe('processSignals', () => {
    it('should create cart insights and cache signals', async () => {
      const signals = [
        { type: ('HESITATION' as any), severity: ('LOW' as any), reason: 'test', metadata: {} }
      ];

      mockPrismaService.cartInsight.create.mockResolvedValue({} as any);
      mockRedisService.set.mockResolvedValue('OK');

      await service.processSignals('user-1', signals);

      expect(mockPrismaService.cartInsight.create).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'cart:signals:user-1',
        JSON.stringify(signals),
        300
      );
    });
  });
});