import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RoomsService } from '../rooms/rooms.service';
import { CoinsService } from '../coins/coins.service';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { CoinValuationService } from '../coins/coin-valuation.service';
import { CommissionService } from '../common/commission.service';
import { PriceResolverService } from '../common/price-resolver.service';
import { InventoryService } from '../inventory/inventory.service';
import { BowRevenueService } from '../bow/bow-revenue.service';
import { OrderStateValidatorService } from './order-state-validator.service';
import { FinancialSnapshotGuardService } from '../common/financial-snapshot-guard.service';
import { RedisService } from '../shared/redis.service';
import { CheckoutService } from '../checkout/checkout.service';
import { EcommerceEventsService } from '../recommendations/ecommerce-events.service';
import { ReferralRewardsService } from '../referrals/referral-rewards.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;
  let coinsService: jest.Mocked<CoinsService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let module: TestingModule;

  const RAZORPAY_SECRET = 'test_secret_key';

  beforeEach(async () => {
    const mockPrismaService: any = {
      order: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      roomMember: {
        updateMany: jest.fn(),
      },
      coinLedger: {
        findFirst: jest.fn(),
      },
      abandonedCheckout: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      payment: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => {
        const txMock = {
          ...mockPrismaService,
          order: {
            ...mockPrismaService.order,
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(txMock);
      }),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'RAZORPAY_KEY_SECRET') return RAZORPAY_SECRET;
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_key';
        return null;
      }),
    };

    const mockRoomsService = {
      checkUnlockStatus: jest.fn(),
    };

    const mockCoinsService = {
      credit: jest.fn(),
      debit: jest.fn(),
    };

    const mockCoinValuation = {
      getActivePaisePerCoin: jest.fn().mockResolvedValue(100), // default
    };

    const mockCommissionService = {
      calculateCommission: jest.fn().mockResolvedValue(0),
      calculateNetVendorEarnings: jest.fn().mockReturnValue(0),
    };

    const mockPriceResolver = {
      resolvePrice: jest.fn().mockResolvedValue(10000),
      calculateTax: jest.fn().mockReturnValue(0),
    };

    const mockInventory = {
      deductStock: jest.fn().mockResolvedValue(undefined),
    };
    inventoryService = mockInventory as any;

    const mockBowRevenue = {
      attributeOutcome: jest.fn().mockResolvedValue(undefined),
    };

    const mockStateValidator = {};
    const mockSnapshotGuard = {};

    const mockRedis = {
      del: jest.fn().mockResolvedValue(1),
    };

    const mockCheckout = {};

    const mockEvents = {
      track: jest.fn().mockResolvedValue(undefined),
    };

    const mockReferralRewards = {
      awardForOrderIfEligible: jest.fn().mockResolvedValue(false),
    };

    module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RoomsService, useValue: mockRoomsService },
        { provide: CoinsService, useValue: mockCoinsService },
        { provide: CoinValuationService, useValue: mockCoinValuation },
        { provide: CommissionService, useValue: mockCommissionService },
        { provide: PriceResolverService, useValue: mockPriceResolver },
        { provide: InventoryService, useValue: mockInventory },
        { provide: BowRevenueService, useValue: mockBowRevenue },
        { provide: OrderStateValidatorService, useValue: mockStateValidator },
        { provide: FinancialSnapshotGuardService, useValue: mockSnapshotGuard },
        { provide: RedisService, useValue: mockRedis },
        { provide: CheckoutService, useValue: mockCheckout },
        { provide: EcommerceEventsService, useValue: mockEvents },
        { provide: ReferralRewardsService, useValue: mockReferralRewards },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);
    coinsService = module.get(CoinsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Payment Signature Verification - P0 Security Fix', () => {
    const generateValidSignature = (orderId: string, paymentId: string): string => {
      return crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    };

    it('should accept valid payment signature', async () => {
      const razorpayOrderId = 'order_test123';
      const razorpayPaymentId = 'pay_test456';
      const validSignature = generateValidSignature(razorpayOrderId, razorpayPaymentId);

      const mockOrder = {
        id: 'internal-order-1',
        userId: 'user-1',
        razorpayOrderId,
        status: 'PENDING',
        items: [{ productId: 'p1', quantity: 1 }],
        coinsUsed: 0,
        coinsUsedDebited: false,
      };

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prismaService.product.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', referredBy: null });
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.abandonedCheckout.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.confirmOrder({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      expect(result.status).toBe('success');
    });

    it('should reject invalid payment signature', async () => {
      const razorpayOrderId = 'order_test123';
      const razorpayPaymentId = 'pay_test456';
      const invalidSignature = 'invalid_signature_hash';

      await expect(
        service.confirmOrder({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: invalidSignature,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject tampered order ID in signature', async () => {
      const razorpayOrderId = 'order_test123';
      const razorpayPaymentId = 'pay_test456';
      // Generate signature with different order ID
      const tamperedSignature = generateValidSignature('order_tampered', razorpayPaymentId);

      await expect(
        service.confirmOrder({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: tamperedSignature,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject tampered payment ID in signature', async () => {
      const razorpayOrderId = 'order_test123';
      const razorpayPaymentId = 'pay_test456';
      // Generate signature with different payment ID
      const tamperedSignature = generateValidSignature(razorpayOrderId, 'pay_tampered');

      await expect(
        service.confirmOrder({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: tamperedSignature,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Idempotency - Duplicate Order Prevention', () => {
    it('should return success for already confirmed order', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CONFIRMED', // Already confirmed
        razorpayOrderId: 'rzp_order_1',
      };

      const validSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update('rzp_order_1|pay_1')
        .digest('hex');

        (prismaService.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
        (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);
        (prismaService.abandonedCheckout.findMany as jest.Mock).mockResolvedValue([]);

        const result = await service.confirmOrder({
          razorpayOrderId: 'rzp_order_1',
          razorpayPaymentId: 'pay_1',
          razorpaySignature: validSignature,
        });

      expect(result.status).toBe('success');
      expect(result.message).toContain('Already processed');
      // Should NOT call update since order is already confirmed
      expect(prismaService.order.update).not.toHaveBeenCalled();
    });

    it('should handle all final order states', async () => {
      const finalStates = ['CONFIRMED', 'DELIVERED', 'PAID', 'SHIPPED', 'PACKED'];

      for (const status of finalStates) {
        const mockOrder = {
          id: 'order-1',
          status,
          razorpayOrderId: 'rzp_order_1',
        };

        const validSignature = crypto
          .createHmac('sha256', RAZORPAY_SECRET)
          .update('rzp_order_1|pay_1')
          .digest('hex');

        (prismaService.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
        (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);
        (prismaService.abandonedCheckout.findMany as jest.Mock).mockResolvedValue([]);

        const result = await service.confirmOrder({
          razorpayOrderId: 'rzp_order_1',
          razorpayPaymentId: 'pay_1',
          razorpaySignature: validSignature,
        });

        expect(result.status).toBe('success');
        expect(result.message).toContain('Already processed');
      }
    });
  });

  describe('Atomic Coins Debit - P0 Security Fix', () => {
    it('should debit coins only once using atomic check-and-set', async () => {
      const razorpayOrderId = 'order_coins_test';
      const razorpayPaymentId = 'pay_coins_test';
      const validSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const mockOrder = {
        id: 'internal-order-1',
        userId: 'user-1',
        razorpayOrderId,
        status: 'PENDING',
        items: [{ productId: 'p1', quantity: 1 }],
        coinsUsed: 100, // User wants to use 100 coins
        coinsUsedDebited: false,
      };

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', referredBy: null });
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.abandonedCheckout.findMany as jest.Mock).mockResolvedValue([]);

      // Mock transaction to return a mock with updateMany that succeeds
      const txMock = {
        order: {
          ...prismaService.order,
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        product: prismaService.product,
        user: prismaService.user,
        payment: prismaService.payment,
        abandonedCheckout: prismaService.abandonedCheckout,
        auditLog: prismaService.auditLog,
        coinLedger: prismaService.coinLedger,
        roomMember: prismaService.roomMember,
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(txMock));

      await service.confirmOrder({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      // Verify atomic check: updateMany with coinsUsedDebited: false condition
      expect(txMock.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockOrder.id,
            coinsUsedDebited: false,
          }),
          data: { coinsUsedDebited: true },
        })
      );

      // Coins should be debited
      expect(coinsService.debit).toHaveBeenCalledWith(
        'user-1',
        100,
        expect.any(String),
        'internal-order-1',
        expect.anything()
      );
    });

    it('should not debit coins if flag already set (race condition prevention)', async () => {
      const razorpayOrderId = 'order_race_test';
      const razorpayPaymentId = 'pay_race_test';
      const validSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const mockOrder = {
        id: 'internal-order-1',
        userId: 'user-1',
        razorpayOrderId,
        status: 'PENDING',
        items: [{ productId: 'p1', quantity: 1 }],
        coinsUsed: 100,
        coinsUsedDebited: false,
      };

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', referredBy: null });
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.abandonedCheckout.findMany as jest.Mock).mockResolvedValue([]);

      // Mock transaction - updateMany for coins flag returns count: 0 (already set by another process)
      const txMock = {
        order: {
          ...prismaService.order,
          updateMany: jest.fn()
            .mockResolvedValueOnce({ count: 1 }) // First call: order status update succeeds
            .mockResolvedValueOnce({ count: 0 }), // Second call: coins flag update fails (already set)
        },
        product: {
          ...prismaService.product,
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        user: prismaService.user,
        payment: prismaService.payment,
        abandonedCheckout: {
          ...prismaService.abandonedCheckout,
          findUnique: jest.fn().mockResolvedValue({ metadata: {}, agentId: null }),
          update: jest.fn().mockResolvedValue({}),
        },
        auditLog: prismaService.auditLog,
        coinLedger: prismaService.coinLedger,
        roomMember: prismaService.roomMember,
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(txMock));

      await service.confirmOrder({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      // Coins should NOT be debited because updateMany for coins flag returned count: 0 (already set)
      expect(coinsService.debit).not.toHaveBeenCalled();
    });

    it('should not attempt coins debit if coinsUsed is 0', async () => {
      const razorpayOrderId = 'order_no_coins';
      const razorpayPaymentId = 'pay_no_coins';
      const validSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const mockOrder = {
        id: 'internal-order-1',
        userId: 'user-1',
        razorpayOrderId,
        status: 'PENDING',
        items: [{ productId: 'p1', quantity: 1 }],
        coinsUsed: 0, // No coins used
        coinsUsedDebited: false,
      };

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', referredBy: null });
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.abandonedCheckout.findMany as jest.Mock).mockResolvedValue([]);

      // Mock transaction - coinsUsed is 0, so coins debit should not be called
      const txMock = {
        order: {
          ...prismaService.order,
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        product: {
          ...prismaService.product,
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        user: prismaService.user,
        payment: prismaService.payment,
        abandonedCheckout: {
          ...prismaService.abandonedCheckout,
          findUnique: jest.fn().mockResolvedValue({ metadata: {}, agentId: null }),
          update: jest.fn().mockResolvedValue({}),
        },
        auditLog: prismaService.auditLog,
        coinLedger: prismaService.coinLedger,
        roomMember: prismaService.roomMember,
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(txMock));

      await service.confirmOrder({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      // Should not call debit when coinsUsed is 0 (the if condition in orders.service.ts line 212 checks coinsUsed > 0)
      expect(coinsService.debit).not.toHaveBeenCalled();
    });
  });

  describe('Stock Deduction - P0 Security Fix', () => {
    it('should fail if stock is insufficient during confirmation', async () => {
      const razorpayOrderId = 'order_stock_test';
      const razorpayPaymentId = 'pay_stock_test';
      const validSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const mockOrder = {
        id: 'internal-order-1',
        userId: 'user-1',
        razorpayOrderId,
        status: 'PENDING',
        items: [{ productId: 'p1', quantity: 10 }], // Requesting 10
        coinsUsed: 0,
        coinsUsedDebited: false,
      };

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prismaService.payment.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.abandonedCheckout.findMany as jest.Mock).mockResolvedValue([]);

      // Mock inventoryService.deductStock to throw (insufficient stock)
      (inventoryService.deductStock as jest.Mock).mockRejectedValue(new BadRequestException('Insufficient stock'));

      // Mock transaction with all required Prisma methods
      const txMock = {
        order: {
          ...prismaService.order,
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        product: {
          ...prismaService.product,
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        user: prismaService.user,
        payment: prismaService.payment,
        abandonedCheckout: {
          ...prismaService.abandonedCheckout,
          findUnique: jest.fn().mockResolvedValue({ metadata: {}, agentId: null }),
          update: jest.fn().mockResolvedValue({}),
        },
        auditLog: prismaService.auditLog,
        coinLedger: prismaService.coinLedger,
        roomMember: prismaService.roomMember,
      };
      (prismaService.$transaction as jest.Mock).mockImplementation((callback) => callback(txMock));

      await expect(
        service.confirmOrder({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
