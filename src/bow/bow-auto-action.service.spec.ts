import { Test, TestingModule } from '@nestjs/testing';
import { BowAutoActionService } from './bow-auto-action.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { CartService } from '../cart/cart.service';

describe('BowAutoActionService', () => {
  let service: BowAutoActionService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let cartService: CartService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    bowActionLog: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userPreferenceProfile: {
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockCartService = {
    addItem: jest.fn(),
    getCart: jest.fn(),
    removeItem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BowAutoActionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    service = module.get<BowAutoActionService>(BowAutoActionService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    cartService = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeAutoAction', () => {
    it('should execute ADD_TO_CART action successfully', async () => {
      const request = {
        actionType: ('ADD_TO_CART' as any),
        userId: 'user-1',
        productId: 'product-1',
        price: 450,
        reason: 'Test action'
      };

      // Mock guardrail checks
      mockRedisService.get.mockResolvedValue(null); // No cooldown
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        stock: 10,
        category: { name: 'test' }
      });
      mockRedisService.get.mockResolvedValue('0'); // Daily count 0

      // Mock cart service
      mockCartService.addItem.mockResolvedValue({ success: true });

      // Mock action log creation
      mockPrismaService.bowActionLog.create.mockResolvedValue({
        id: 'action-1',
        userId: 'user-1',
        actionType: 'ADD_TO_CART'
      });

      const result = await service.executeAutoAction(request);

      expect(result.success).toBe(true);
      expect(result.actionId).toBe('action-1');
      expect(mockCartService.addItem).toHaveBeenCalled();
    });

    it('should block action due to price limit', async () => {
      const request = {
        actionType: ('ADD_TO_CART' as any),
        userId: 'user-1',
        productId: 'product-1',
        price: 600, // Over limit
        reason: 'Test action'
      };

      const result = await service.executeAutoAction(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('exceeds auto-add limit');
    });

    it('should block action due to cooldown', async () => {
      const request = {
        actionType: ('ADD_TO_CART' as any),
        userId: 'user-1',
        productId: 'product-1',
        price: 450,
        reason: 'Test action'
      };

      // Mock active cooldown
      mockRedisService.get.mockResolvedValueOnce((Date.now() - 1000).toString()); // Recent action

      const result = await service.executeAutoAction(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cooldown active');
    });

    it('should block action for insufficient stock', async () => {
      const request = {
        actionType: ('ADD_TO_CART' as any),
        userId: 'user-1',
        productId: 'product-1',
        price: 450,
        quantity: 5,
        reason: 'Test action'
      };

      mockRedisService.get.mockResolvedValue(null); // No cooldown
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        stock: 3, // Less than requested
        category: { name: 'test' }
      });

      const result = await service.executeAutoAction(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('insufficient stock');
    });
  });

  describe('reverseAutoAction', () => {
    it('should reverse ADD_TO_CART action', async () => {
      const actionLog = {
        id: 'action-1',
        userId: 'user-1',
        actionType: 'ADD_TO_CART',
        productId: 'product-1',
        quantity: 1,
        autoReversed: false
      };

      mockPrismaService.bowActionLog.findUnique.mockResolvedValue(actionLog);
      mockPrismaService.bowActionLog.update.mockResolvedValue({ ...actionLog, autoReversed: true });
      mockCartService.getCart.mockResolvedValue({
        items: [{ id: 'item-1', productId: 'product-1', quantity: 1 }]
      });
      mockCartService.removeItem.mockResolvedValue({});

      const result = await service.reverseAutoAction('user-1', 'action-1');

      expect(result.success).toBe(true);
      expect(mockCartService.removeItem).toHaveBeenCalledWith('user-1', 'item-1');
    });

    it('should not reverse already reversed action', async () => {
      const actionLog = {
        id: 'action-1',
        userId: 'user-1',
        actionType: 'ADD_TO_CART',
        autoReversed: true
      };

      mockPrismaService.bowActionLog.findUnique.mockResolvedValue(actionLog);

      const result = await service.reverseAutoAction('user-1', 'action-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('already reversed');
    });
  });

  describe('validateGuardrails', () => {
    it('should pass all guardrails for valid action', async () => {
      const request = {
        actionType: ('ADD_TO_CART' as any),
        userId: 'user-1',
        productId: 'product-1',
        price: 450,
        reason: 'Test'
      };

      mockRedisService.get.mockResolvedValue(null); // No cooldown/daily limits
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        stock: 10,
        category: { name: 'electronics' }
      });

      const result = await (service as any).validateGuardrails(request);

      expect(result.allowed).toBe(true);
    });

    it('should fail restricted category check', async () => {
      const request = {
        actionType: ('ADD_TO_CART' as any),
        userId: 'user-1',
        productId: 'product-1',
        price: 450,
        reason: 'Test'
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        isActive: true,
        stock: 10,
        category: { name: 'alcohol' } // Restricted
      });

      const result = await (service as any).validateGuardrails(request);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('restricted category');
    });
  });
});