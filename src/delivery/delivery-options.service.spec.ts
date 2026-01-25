import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryOptionsService } from './delivery-options.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DeliveryOptionsService', () => {
  let service: DeliveryOptionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      vendorServiceArea: { findMany: jest.fn() },
      vendorDeliveryWindow: { findMany: jest.fn() },
      vendor: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
      order: { findMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryOptionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DeliveryOptionsService);
  });

  it('returns not eligible when vendor has no service areas', async () => {
    prisma.vendorServiceArea.findMany.mockResolvedValue([]);
    const res = await service.getDeliveryOptions({ vendorId: 'v1', point: { lat: 17, lng: 78 } });
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe('NO_SERVICE_AREA');
  });

  it('is eligible for radius service area and returns slots', async () => {
    prisma.vendorServiceArea.findMany.mockResolvedValue([
      { type: 'RADIUS', centerLat: 17.0, centerLng: 78.0, radiusKm: 5, isActive: true },
    ]);
    prisma.vendorDeliveryWindow.findMany.mockResolvedValue([
      { weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60, isActive: true },
    ]);
    prisma.vendor.findUnique.mockResolvedValue({ storeTimings: null });

    const res = await service.getDeliveryOptions({ vendorId: 'v1', point: { lat: 17.01, lng: 78.01 } });
    expect(res.eligible).toBe(true);
    expect(Array.isArray(res.availableSlots)).toBe(true);
    expect(res.availableSlots.length).toBeGreaterThan(0);
  });
});

