import { Test, TestingModule } from '@nestjs/testing';
import { BowCoinService } from '../src/admin/coins/bow-coin.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock Prisma Service
const mockPrismaService = {
  coinConfig: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  coinTransaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  adminAuditLog: {
    create: jest.fn(),
  },
};

describe('BowCoinService', () => {
  let service: BowCoinService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BowCoinService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BowCoinService>(BowCoinService);
    prisma = mockPrismaService;

    jest.clearAllMocks();
  });

  describe('grantCoins', () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@test.com',
      coinBalance: 100,
    };

    it('should grant coins successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.coinConfig.findFirst.mockResolvedValue({
        coinExpiryDays: 365,
      });
      prisma.coinTransaction.create.mockResolvedValue({
        id: 'tx-123',
        userId: 'user-123',
        amount: 50,
        type: 'ADMIN_GRANT',
      });
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        coinBalance: 150,
      });
      prisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.grantCoins({
        userId: 'user-123',
        amount: 50,
        reason: 'Test grant',
        grantedById: 'admin-123',
      });

      expect(result.amount).toBe(50);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            coinBalance: 150,
          }),
        }),
      );
    });

    it('should throw for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.grantCoins({
          userId: 'invalid-user',
          amount: 50,
          reason: 'Test',
          grantedById: 'admin-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw for negative amount', async () => {
      await expect(
        service.grantCoins({
          userId: 'user-123',
          amount: -50,
          reason: 'Test',
          grantedById: 'admin-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeCoins', () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@test.com',
      coinBalance: 100,
    };

    it('should revoke coins successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.coinTransaction.create.mockResolvedValue({
        id: 'tx-123',
        userId: 'user-123',
        amount: -30,
        type: 'ADMIN_REVOKE',
      });
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        coinBalance: 70,
      });
      prisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.revokeCoins({
        userId: 'user-123',
        amount: 30,
        reason: 'Policy violation',
        revokedById: 'admin-123',
      });

      expect(result.amount).toBe(-30);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            coinBalance: 70,
          }),
        }),
      );
    });

    it('should throw when revoking more than balance', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        coinBalance: 20,
      });

      await expect(
        service.revokeCoins({
          userId: 'user-123',
          amount: 50, // More than balance
          reason: 'Test',
          revokedById: 'admin-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateRedemption', () => {
    const mockConfig = {
      minRedemptionAmount: 100,
      maxRedemptionPercentage: 20,
    };

    const mockUser = {
      id: 'user-123',
      coinBalance: 500,
    };

    it('should validate redemption successfully', async () => {
      prisma.coinConfig.findFirst.mockResolvedValue(mockConfig);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateRedemption('user-123', 150, 1000);

      expect(result.valid).toBe(true);
      expect(result.coinsToRedeem).toBe(150);
      expect(result.discountAmount).toBeDefined();
    });

    it('should reject below minimum redemption', async () => {
      prisma.coinConfig.findFirst.mockResolvedValue(mockConfig);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateRedemption('user-123', 50, 1000);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimum');
    });

    it('should cap at max percentage', async () => {
      prisma.coinConfig.findFirst.mockResolvedValue(mockConfig);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Try to redeem 500 coins on 1000 order (50%)
      // Should be capped at 20% = 200 rupees worth
      const result = await service.validateRedemption('user-123', 500, 1000);

      expect(result.valid).toBe(true);
      // Should be capped based on maxRedemptionPercentage
    });

    it('should reject when user has insufficient balance', async () => {
      prisma.coinConfig.findFirst.mockResolvedValue(mockConfig);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        coinBalance: 50,
      });

      const result = await service.validateRedemption('user-123', 200, 1000);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('balance');
    });
  });

  describe('getConfig', () => {
    it('should return existing config', async () => {
      const mockConfig = {
        id: 'config-123',
        coinsPerRupee: 0.1,
        minRedemptionAmount: 100,
        maxRedemptionPercentage: 20,
        coinExpiryDays: 365,
      };

      prisma.coinConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getConfig();

      expect(result.coinsPerRupee).toBe(0.1);
      expect(result.minRedemptionAmount).toBe(100);
    });

    it('should create default config if none exists', async () => {
      prisma.coinConfig.findFirst.mockResolvedValue(null);
      prisma.coinConfig.create.mockResolvedValue({
        id: 'new-config',
        coinsPerRupee: 0.1,
        minRedemptionAmount: 100,
        maxRedemptionPercentage: 20,
        coinExpiryDays: 365,
      });

      const result = await service.getConfig();

      expect(prisma.coinConfig.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('should return coin statistics', async () => {
      prisma.user.aggregate = jest.fn().mockResolvedValue({
        _sum: { coinBalance: 50000 },
      });
      prisma.coinTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 10000 },
      });
      prisma.coinTransaction.count.mockResolvedValue(500);
      prisma.user.count.mockResolvedValue(100);

      const result = await service.getStatistics();

      expect(result.totalCirculation).toBe(50000);
      expect(result.totalTransactions).toBe(500);
      expect(result.usersWithCoins).toBe(100);
    });
  });
});
