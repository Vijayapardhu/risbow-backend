import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoinsService } from '../coins/coins.service';
import { AuditLogService } from '../audit/audit.service';
import { RedisService } from '../shared/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VendorAvailabilityService } from './vendor-availability.service';

const mockPrisma: any = {
    vendor: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
    },
    product: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    order: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    banner: {
        findFirst: jest.fn(),
        create: jest.fn(),
    },
    vendorPromotion: {
        create: jest.fn(),
    },
    auditLog: {
        create: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
};

const mockAudit = {
    logAdminAction: jest.fn(),
};

describe('VendorsService', () => {
    let service: VendorsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VendorsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: CoinsService, useValue: {} },
                { provide: AuditLogService, useValue: mockAudit },
                { provide: RedisService, useValue: mockRedis },
                { provide: VendorAvailabilityService, useValue: { getAvailability: jest.fn().mockReturnValue({ openNow: true }) } },
            ],
        }).compile();

        service = module.get<VendorsService>(VendorsService);
        jest.clearAllMocks();
    });

    describe('Banner Purchase', () => {
        it('should purchase banner successfully', async () => {
            const vendorId = 'v1';
            const dto = {
                imageUrl: 'img.png',
                slotType: 'HOME',
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                coinsCost: 100,
            };

            mockPrisma.vendor.findUnique.mockResolvedValue({ id: vendorId, coinsBalance: 200 });
            mockPrisma.banner.findFirst.mockResolvedValue(null);
            mockPrisma.vendor.updateMany.mockResolvedValue({ count: 1 });
            mockPrisma.banner.create.mockResolvedValue({ id: 'b1' });

            const result = await service.purchaseBanner(vendorId, dto);
            expect(result.id).toBe('b1');
            expect(mockPrisma.vendor.updateMany).toHaveBeenCalled();
        });

        it('should throw if insufficient coins', async () => {
            mockPrisma.vendor.findUnique.mockResolvedValue({ id: 'v1', coinsBalance: 50 });
            await expect(service.purchaseBanner('v1', { coinsCost: 100 } as any))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw if slot conflict exists', async () => {
            mockPrisma.vendor.findUnique.mockResolvedValue({ id: 'v1', coinsBalance: 200 });
            mockPrisma.banner.findFirst.mockResolvedValue({ id: 'existing' });
            await expect(service.purchaseBanner('v1', { slotType: 'HOME', coinsCost: 100 } as any))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('KYC Updates', () => {
        it('should update KYC from PENDING to VERIFIED', async () => {
            mockPrisma.vendor.findUnique.mockResolvedValue({ id: 'v1', kycStatus: 'PENDING' });
            mockPrisma.vendor.update.mockResolvedValue({ id: 'v1', kycStatus: 'VERIFIED' });

            await service.updateKycStatus('admin1', 'v1', { status: 'VERIFIED' });
            expect(mockPrisma.vendor.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ kycStatus: 'VERIFIED' })
            }));
        });

        it('should throw on invalid transition', async () => {
            mockPrisma.vendor.findUnique.mockResolvedValue({ id: 'v1', kycStatus: 'VERIFIED' });
            await expect(service.updateKycStatus('admin1', 'v1', { status: 'REJECTED' }))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('Analytics Caching', () => {
        it('getVendorStats should return cached data if available', async () => {
            mockRedis.get.mockResolvedValue(JSON.stringify({ todayOrders: 5 }));
            const result = await service.getVendorStats('v1');
            expect(result.todayOrders).toBe(5);
            expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
        });

        it('getVendorStats should compute and cache on miss', async () => {
            mockRedis.get.mockResolvedValue(null);
            mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
            mockPrisma.order.findMany.mockResolvedValue([]);
            mockPrisma.product.count.mockResolvedValue(1);

            await service.getVendorStats('v1');
            expect(mockRedis.set).toHaveBeenCalled();
        });
    });

    describe('Deep Analytics', () => {
        beforeEach(() => {
            mockRedis.get.mockResolvedValue(null);
            mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', title: 'P1' }]);
        });

        it('getSalesAnalytics should aggregate daily data', async () => {
            mockPrisma.order.findMany.mockResolvedValue([
                {
                    createdAt: new Date(),
                    items: [{ productId: 'p1', price: 100, quantity: 2 }]
                }
            ]);
            mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', title: 'P1', category: { name: 'C1' } }]);

            const result = await service.getSalesAnalytics('v1', 7);
            expect(result.daily.length).toBeGreaterThan(0);
            const today = result.daily.find((d: { date: string }) => d.date === new Date().toISOString().split('T')[0]);
            expect(today.revenue).toBe(200);
        });

        it('getProductAnalytics should calculate stock velocity', async () => {
            mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', title: 'P1', stock: 5, reviews: [] }]);
            mockPrisma.order.findMany.mockResolvedValue([
                { items: [{ productId: 'p1', price: 100, quantity: 15 }], createdAt: new Date() }
            ]);

            const result = await service.getProductAnalytics('v1');
            expect(result.lowStock[0].dailySales).toBe(0.5); // 15 / 30
            expect(result.lowStock[0].daysUntilOut).toBe(10); // 5 / 0.5
        });

        it('getCustomerAnalytics should identify repeat customers', async () => {
            mockPrisma.order.findMany.mockResolvedValue([
                { userId: 'u1', items: [{ productId: 'p1', price: 100, quantity: 1 }], user: { name: 'User 1' } },
                { userId: 'u1', items: [{ productId: 'p1', price: 100, quantity: 1 }], user: { name: 'User 1' } },
                { userId: 'u2', items: [{ productId: 'p1', price: 100, quantity: 1 }], user: { name: 'User 2' } }
            ]);

            const result = await service.getCustomerAnalytics('v1');
            expect(result.totalCustomers).toBe(2);
            expect(result.repeatCustomers).toBe(1);
            expect(result.repeatRate).toBe(50);
        });
    });
});
