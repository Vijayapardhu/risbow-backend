import { Test, TestingModule } from '@nestjs/testing';
import { ReferralRewardsService } from './referral-rewards.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoinsService } from '../coins/coins.service';
import { OrderStatus } from '@prisma/client';

describe('ReferralRewardsService', () => {
  let service: ReferralRewardsService;
  let prisma: jest.Mocked<PrismaService>;
  let coins: jest.Mocked<CoinsService>;

  beforeEach(async () => {
    const mockPrisma: any = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      referralRewardRule: {
        findFirst: jest.fn(),
      },
      referralRewardGrant: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };

    const mockCoins: any = {
      credit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralRewardsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CoinsService, useValue: mockCoins },
      ],
    }).compile();

    service = module.get(ReferralRewardsService);
    prisma = module.get(PrismaService);
    coins = module.get(CoinsService);
  });

  it('does not award if not first paid order', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({
      id: 'o2',
      userId: 'u2',
      status: OrderStatus.PAID,
      payment: { amount: 50000 },
      OrderFinancialSnapshot: null,
    });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u2', referredBy: 'u1' });
    (prisma.order.findFirst as any).mockResolvedValue({ id: 'o1' }); // first paid is different

    const res = await service.awardForOrderIfEligible('o2');
    expect(res.awarded).toBe(false);
    expect(coins.credit).not.toHaveBeenCalled();
  });

  it('awards once for first paid order using slab rule', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({
      id: 'o1',
      userId: 'u2',
      status: OrderStatus.PAID,
      payment: { amount: 120000 },
      OrderFinancialSnapshot: null,
    });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u2', referredBy: 'u1' });
    (prisma.order.findFirst as any).mockResolvedValue({ id: 'o1' });
    (prisma.referralRewardRule.findFirst as any).mockResolvedValue({
      id: 'r1',
      coinsInviter: 200,
      coinsInvitee: 100,
    });
    (prisma.referralRewardGrant.findUnique as any).mockResolvedValue(null);

    const res = await service.awardForOrderIfEligible('o1');
    expect(res.awarded).toBe(true);
    expect(prisma.referralRewardGrant.create).toHaveBeenCalled();
    expect(coins.credit).toHaveBeenCalledTimes(2);
  });

  it('is idempotent via existing grant', async () => {
    (prisma.order.findUnique as any).mockResolvedValue({
      id: 'o1',
      userId: 'u2',
      status: OrderStatus.PAID,
      payment: { amount: 120000 },
      OrderFinancialSnapshot: null,
    });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u2', referredBy: 'u1' });
    (prisma.order.findFirst as any).mockResolvedValue({ id: 'o1' });
    (prisma.referralRewardRule.findFirst as any).mockResolvedValue({
      id: 'r1',
      coinsInviter: 200,
      coinsInvitee: 100,
    });
    (prisma.referralRewardGrant.findUnique as any).mockResolvedValue({ id: 'g1' }); // already exists

    const res = await service.awardForOrderIfEligible('o1');
    expect(res.awarded).toBe(true);
    expect(coins.credit).not.toHaveBeenCalled();
  });
});

