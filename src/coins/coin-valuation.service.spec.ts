import { Test, TestingModule } from '@nestjs/testing';
import { CoinValuationService } from './coin-valuation.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('CoinValuationService', () => {
  let service: CoinValuationService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma: any = {
      coinValuation: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoinValuationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CoinValuationService);
    prisma = module.get(PrismaService);
  });

  it('should fall back to default when no valuation exists', async () => {
    (prisma as any).coinValuation.findFirst.mockResolvedValue(null);
    const v = await service.getActivePaisePerCoin(UserRole.CUSTOMER);
    expect(v).toBe(100);
  });

  it('should validate paisePerCoin', async () => {
    await expect(
      service.setValuation({ actorUserId: 'admin-1', role: UserRole.CUSTOMER, paisePerCoin: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should be idempotent if same valuation already active', async () => {
    const active = { id: 'cv1', role: UserRole.CUSTOMER, paisePerCoin: 10, effectiveTo: null };
    (prisma as any).coinValuation.findFirst.mockResolvedValue(active);

    const res = await service.setValuation({
      actorUserId: 'admin-1',
      role: UserRole.CUSTOMER,
      paisePerCoin: 10,
    });

    expect(res).toEqual(active);
    expect((prisma as any).coinValuation.updateMany).not.toHaveBeenCalled();
    expect((prisma as any).coinValuation.create).not.toHaveBeenCalled();
  });
});

