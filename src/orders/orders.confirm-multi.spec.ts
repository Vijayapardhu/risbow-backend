import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RoomsService } from '../rooms/rooms.service';
import { CoinsService } from '../coins/coins.service';
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
import * as crypto from 'crypto';
import { OrderStatus } from '@prisma/client';

describe('OrdersService.confirmOrder (multi-order razorpayOrderId)', () => {
  const RAZORPAY_SECRET = 'test_secret_key';
  let service: OrdersService;
  let prisma: any;
  let inventory: any;
  let redis: any;

  const sig = (orderId: string, paymentId: string) =>
    crypto.createHmac('sha256', RAZORPAY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

  beforeEach(async () => {
    prisma = {
      order: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      abandonedCheckout: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      roomMember: { updateMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    inventory = { deductStock: jest.fn() };
    redis = { del: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'RAZORPAY_KEY_SECRET' ? RAZORPAY_SECRET : 'rzp_key') } },
        { provide: RoomsService, useValue: { checkUnlockStatus: jest.fn() } },
        { provide: CoinsService, useValue: { debit: jest.fn() } },
        { provide: CoinValuationService, useValue: { getActivePaisePerCoin: jest.fn() } },
        { provide: CommissionService, useValue: {} },
        { provide: PriceResolverService, useValue: { resolvePrice: jest.fn() } },
        { provide: InventoryService, useValue: inventory },
        { provide: BowRevenueService, useValue: { attributeOutcome: jest.fn() } },
        { provide: OrderStateValidatorService, useValue: {} },
        { provide: FinancialSnapshotGuardService, useValue: {} },
        { provide: RedisService, useValue: redis },
        { provide: CheckoutService, useValue: {} },
        { provide: EcommerceEventsService, useValue: { track: jest.fn() } },
        { provide: ReferralRewardsService, useValue: { awardForOrderIfEligible: jest.fn() } },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  it('confirms multiple orders for same razorpayOrderId idempotently', async () => {
    const razorpayOrderId = 'rzp_order_multi';
    const razorpayPaymentId = 'pay_1';

    prisma.order.findMany.mockResolvedValue([
      { id: 'o1', userId: 'u1', status: OrderStatus.PENDING_PAYMENT, items: [{ productId: 'p1', quantity: 1 }], coinsUsed: 0, abandonedCheckoutId: null, roomId: null, checkoutGroupId: 'cg1' },
      { id: 'o2', userId: 'u1', status: OrderStatus.PENDING_PAYMENT, items: [{ productId: 'p2', quantity: 2 }], coinsUsed: 0, abandonedCheckoutId: null, roomId: null, checkoutGroupId: 'cg1' },
    ]);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });

    const res = await service.confirmOrder({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: sig(razorpayOrderId, razorpayPaymentId),
    });

    expect(res.status).toBe('success');
    expect(Array.isArray((res as any).orderIds)).toBe(true);
    expect(inventory.deductStock).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith('payment:timeout:cg:cg1');
  });
});

