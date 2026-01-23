import { Test, TestingModule } from '@nestjs/testing';
import { RoomMonetizationService } from './room-monetization.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import { RedisService } from '../shared/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoomBoostType } from '@prisma/client';

describe('RoomMonetizationService', () => {
  let service: RoomMonetizationService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrisma = {
    $transaction: jest.fn(),
    room: { findUnique: jest.fn() },
    roomBoost: { findFirst: jest.fn(), create: jest.fn() },
    vendor: { updateMany: jest.fn() },
    coinLedger: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const mockRedis = {
    lpush: jest.fn(),
    ltrim: jest.fn(),
  };

  const mockAudit = {
    logAdminAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomMonetizationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AuditLogService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<RoomMonetizationService>(RoomMonetizationService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  it('should purchase boost successfully for vendor', async () => {
    const mockTx = {
      room: { findUnique: jest.fn().mockResolvedValue({ id: 'room1', status: 'ACTIVE' }) },
      roomBoost: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'boost1', roomId: 'room1', type: RoomBoostType.PRIORITY_VISIBILITY })
      },
      vendor: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      coinLedger: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => await callback(mockTx));

    const result = await service.purchaseRoomBoost('actor1', {
      roomId: 'room1',
      type: RoomBoostType.PRIORITY_VISIBILITY,
      coinsCost: 500,
      durationMinutes: 120,
      vendorId: 'vendor1'
    });

    expect(result.id).toBe('boost1');
    expect(mockTx.vendor.updateMany).toHaveBeenCalled();
  });

  it('should throw error if boost already active', async () => {
    const mockTx = {
      room: { findUnique: jest.fn().mockResolvedValue({ id: 'room1', status: 'ACTIVE' }) },
      roomBoost: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing', endAt: new Date() }),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => await callback(mockTx));

    await expect(service.purchaseRoomBoost('actor1', {
      roomId: 'room1',
      type: RoomBoostType.PRIORITY_VISIBILITY,
      coinsCost: 500,
      durationMinutes: 120,
      vendorId: 'vendor1'
    })).rejects.toThrow(BadRequestException);
  });
});