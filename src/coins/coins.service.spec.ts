import { Test, TestingModule } from '@nestjs/testing';
import { CoinsService } from './coins.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoinSource } from './dto/coin.dto';
import { BadRequestException } from '@nestjs/common';
import { CoinValuationService } from './coin-valuation.service';
import { UserRole } from '@prisma/client';

describe('CoinsService', () => {
  let service: CoinsService;
  let prismaService: jest.Mocked<PrismaService>;
  let coinValuation: jest.Mocked<CoinValuationService>;

  beforeEach(async () => {
    const mockPrismaService: any = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      coinLedger: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      referralTracking: {
        count: jest.fn(),
      },
      $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
    };

    const mockCoinValuationService = {
      getActivePaisePerCoin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoinsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CoinValuationService, useValue: mockCoinValuationService },
      ],
    }).compile();

    service = module.get<CoinsService>(CoinsService);
    prismaService = module.get(PrismaService);
    coinValuation = module.get(CoinValuationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Coins Expiry - P0 Audit Fix', () => {
    it('should mark coins as expired using isExpired flag (not mutate amount)', async () => {
      const expiredCredits = [
        { id: 'credit-1', userId: 'user-1', amount: 100, expiresAt: new Date('2024-01-01'), isExpired: false },
        { id: 'credit-2', userId: 'user-2', amount: 50, expiresAt: new Date('2024-01-01'), isExpired: false },
      ];

      (prismaService.coinLedger.findMany as jest.Mock).mockResolvedValue(expiredCredits);
      (prismaService.coinLedger.update as jest.Mock).mockResolvedValue({});
      (prismaService.coinLedger.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
      (prismaService.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.expireCoinsCron();

      expect(result.expired).toBe(2);

      // Verify isExpired flag is set (not amount mutation)
      expect(prismaService.coinLedger.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'credit-1' },
          data: { isExpired: true }, // NOT amount: 0
        })
      );

      expect(prismaService.coinLedger.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'credit-2' },
          data: { isExpired: true },
        })
      );
    });

    it('should only process unexpired credits', async () => {
      (prismaService.coinLedger.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.expireCoinsCron();

      expect(result.expired).toBe(0);

      // Verify query filters for isExpired: false
      expect(prismaService.coinLedger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isExpired: false,
          }),
        })
      );
    });

    it('should recalculate user balance after expiring coins', async () => {
      const expiredCredits = [
        { id: 'credit-1', userId: 'user-1', amount: 100, expiresAt: new Date('2024-01-01'), isExpired: false },
      ];

      (prismaService.coinLedger.findMany as jest.Mock).mockResolvedValue(expiredCredits);
      (prismaService.coinLedger.update as jest.Mock).mockResolvedValue({});
      (prismaService.coinLedger.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 50 } });
      (prismaService.user.update as jest.Mock).mockResolvedValue({});

      await service.expireCoinsCron();

      // Verify recalculateBalance was called (indirectly through user.update)
      expect(prismaService.user.update).toHaveBeenCalled();
    });
  });

  describe('Ledger Snapshot - Bow Coin Valuation', () => {
    it('should snapshot roleAtTxn and paisePerCoinAtTxn on credit', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ role: UserRole.CUSTOMER });
      (coinValuation.getActivePaisePerCoin as jest.Mock).mockResolvedValue(10);
      (prismaService.coinLedger.create as jest.Mock).mockResolvedValue({});
      (prismaService.user.update as jest.Mock).mockResolvedValue({});

      await service.credit('user-1', 50, CoinSource.ADMIN_CREDIT, 'ref-1');

      expect(prismaService.coinLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            amount: 50,
            roleAtTxn: UserRole.CUSTOMER,
            paisePerCoinAtTxn: 10,
          }),
        }),
      );
    });

    it('should snapshot roleAtTxn and paisePerCoinAtTxn on debit', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ coinsBalance: 100, role: UserRole.CUSTOMER });
      (coinValuation.getActivePaisePerCoin as jest.Mock).mockResolvedValue(25);
      (prismaService.coinLedger.create as jest.Mock).mockResolvedValue({});
      (prismaService.user.update as jest.Mock).mockResolvedValue({});

      await service.debit('user-1', 10, CoinSource.SPEND_ORDER, 'order-1');

      expect(prismaService.coinLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            amount: -10,
            roleAtTxn: UserRole.CUSTOMER,
            paisePerCoinAtTxn: 25,
          }),
        }),
      );
    });
  });

  describe('Balance Calculation - P0 Fix', () => {
    it('should exclude expired credits from balance', async () => {
      const userId = 'user-1';

      (prismaService.coinLedger.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 200 } }) // Credits (non-expired)
        .mockResolvedValueOnce({ _sum: { amount: -50 } }); // Debits

      (prismaService.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.recalculateBalance(userId);

      expect(result.balance).toBe(150); // 200 - 50

      // Verify query excludes expired credits
      expect(prismaService.coinLedger.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            amount: { gt: 0 },
            isExpired: false, // KEY: Must exclude expired
          }),
        })
      );
    });
  });

  describe('Credit Idempotency - P0 Fix', () => {
    it('should not double-credit for same referenceId', async () => {
      const userId = 'user-1';
      const referenceId = 'order-123';

      // Simulate existing credit with same referenceId
      (prismaService.coinLedger.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-credit',
        userId,
        amount: 100,
        referenceId,
      });

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ id: userId });

      await service.credit(userId, 100, CoinSource.REFERRAL, referenceId);

      // Should NOT create new ledger entry
      expect(prismaService.coinLedger.create).not.toHaveBeenCalled();
    });

    it('should create credit for new referenceId', async () => {
      const userId = 'user-1';
      const referenceId = 'order-456';

      // No existing credit
      (prismaService.coinLedger.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.coinLedger.create as jest.Mock).mockResolvedValue({});
      (prismaService.user.update as jest.Mock).mockResolvedValue({ coinsBalance: 100 });

      await service.credit(userId, 100, CoinSource.REFERRAL, referenceId);

      expect(prismaService.coinLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            amount: 100,
            source: CoinSource.REFERRAL,
            referenceId,
            isExpired: false,
          }),
        })
      );
    });
  });

  describe('Debit Validation', () => {
    it('should reject debit if balance insufficient', async () => {
      const userId = 'user-1';

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        coinsBalance: 50, // Only 50 coins
      });

      await expect(
        service.debit(userId, 100, CoinSource.SPEND_ORDER, 'order-1') // Trying to debit 100
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow debit if balance sufficient', async () => {
      const userId = 'user-1';

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        coinsBalance: 200,
      });
      (prismaService.coinLedger.create as jest.Mock).mockResolvedValue({});
      (prismaService.user.update as jest.Mock).mockResolvedValue({ coinsBalance: 100 });

      await service.debit(userId, 100, CoinSource.SPEND_ORDER, 'order-1');

      expect(prismaService.coinLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            amount: -100, // Negative for debit
            source: CoinSource.SPEND_ORDER,
          }),
        })
      );
    });
  });

  describe('Fraud Detection', () => {
    it('should detect self-referral', async () => {
      const result = await service.checkFraud('user-1', 'user-1');
      expect(result).toBe(true);
    });

    it('should detect excessive referrals from same IP', async () => {
      (prismaService.referralTracking.count as jest.Mock).mockResolvedValue(6); // More than 5

      const result = await service.checkFraud('referrer-1', 'referee-1', '192.168.1.1');
      expect(result).toBe(true);
    });

    it('should allow legitimate referral', async () => {
      (prismaService.referralTracking.count as jest.Mock).mockResolvedValue(2); // Less than 5

      const result = await service.checkFraud('referrer-1', 'referee-1', '192.168.1.1');
      expect(result).toBe(false);
    });
  });
});
