import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: {
            wallet: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            ledgerEntry: {
              create: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn({
              wallet: {
                findUnique: jest.fn(),
                update: jest.fn(),
              },
              ledgerEntry: {
                create: jest.fn(),
              },
            })),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
  });

  it('should prevent duplicate credits', async () => {
    redis.get.mockResolvedValue('true');
    const result = await service.creditWallet('user1', 100, 'key1', 'test');
    expect(result).toEqual({ status: 'already_processed' });
  });

  it('should credit wallet atomically', async () => {
    redis.get.mockResolvedValue(null);
    const mockTx = {
      wallet: {
        findUnique: jest.fn().mockResolvedValue({ id: '1', userId: 'user1', balance: 500 }),
        update: jest.fn().mockResolvedValue({ id: '1', userId: 'user1', balance: 600 }),
      },
      ledgerEntry: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(mockTx as any));

    const result = await service.creditWallet('user1', 100, 'key1', 'test');
    expect(result).toEqual({ balance: 600 });
  });
});