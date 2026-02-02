import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService, ReportType } from '../src/admin/reports/reporting.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Mock Prisma Service
const mockPrismaService = {
  order: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  orderItem: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  vendor: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  review: {
    aggregate: jest.fn(),
  },
  coinTransaction: {
    findMany: jest.fn(),
  },
  bannerMetric: {
    aggregate: jest.fn(),
  },
};

describe('ReportingService', () => {
  let service: ReportingService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    prisma = mockPrismaService;

    jest.clearAllMocks();
  });

  describe('getSalesSummary', () => {
    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    it('should return sales summary', async () => {
      const mockOrders = [
        { id: '1', totalAmount: 1000, status: 'DELIVERED', createdAt: new Date('2024-01-15') },
        { id: '2', totalAmount: 500, status: 'DELIVERED', createdAt: new Date('2024-01-15') },
        { id: '3', totalAmount: 750, status: 'CANCELLED', createdAt: new Date('2024-01-20') },
      ];

      prisma.order.findMany
        .mockResolvedValueOnce(mockOrders) // Current period
        .mockResolvedValueOnce([{ totalAmount: 1000 }]); // Previous period

      const result = await service.getSalesSummary(dateRange);

      expect(result.summary.totalRevenue).toBe(2250);
      expect(result.summary.orderCount).toBe(3);
      expect(result.summary.avgOrderValue).toBe(750);
      expect(result.byStatus).toBeDefined();
      expect(result.byDate).toBeDefined();
    });

    it('should calculate revenue growth', async () => {
      prisma.order.findMany
        .mockResolvedValueOnce([{ id: '1', totalAmount: 2000, status: 'DELIVERED', createdAt: new Date() }])
        .mockResolvedValueOnce([{ totalAmount: 1000 }]); // Previous period was 1000

      const result = await service.getSalesSummary(dateRange);

      // Growth from 1000 to 2000 = 100%
      expect(result.summary.revenueGrowth).toBe(100);
    });
  });

  describe('getSalesByVendor', () => {
    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    it('should return sales grouped by vendor', async () => {
      prisma.orderItem.groupBy.mockResolvedValue([
        { vendorId: 'v1', _sum: { total: 5000, quantity: 50 }, _count: { id: 10 } },
        { vendorId: 'v2', _sum: { total: 3000, quantity: 30 }, _count: { id: 5 } },
      ]);

      prisma.vendor.findMany.mockResolvedValue([
        { id: 'v1', storeName: 'Store 1' },
        { id: 'v2', storeName: 'Store 2' },
      ]);

      const result = await service.getSalesByVendor(dateRange, 10);

      expect(result).toHaveLength(2);
      expect(result[0].vendorName).toBe('Store 1');
      expect(result[0].totalRevenue).toBe(5000);
    });
  });

  describe('getUserGrowth', () => {
    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    it('should return user growth by day', async () => {
      prisma.user.findMany.mockResolvedValue([
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-01-20') },
      ]);
      prisma.user.count.mockResolvedValue(100);

      const result = await service.getUserGrowth(dateRange, 'day');

      expect(result.summary.newUsers).toBe(3);
      expect(result.summary.totalUsers).toBe(100);
      expect(result.timeline).toBeDefined();
    });

    it('should group by month when specified', async () => {
      prisma.user.findMany.mockResolvedValue([
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-02-15') },
      ]);
      prisma.user.count.mockResolvedValue(50);

      const result = await service.getUserGrowth(
        { startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') },
        'month',
      );

      expect(result.timeline.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getPlatformOverview', () => {
    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    it('should return platform overview', async () => {
      prisma.user.count
        .mockResolvedValueOnce(1000) // total users
        .mockResolvedValueOnce(100); // new users

      prisma.vendor.count
        .mockResolvedValueOnce(50) // active vendors
        .mockResolvedValueOnce(5); // new vendors

      prisma.product.count
        .mockResolvedValueOnce(500) // total products
        .mockResolvedValueOnce(450); // active products

      prisma.order.count.mockResolvedValue(200);
      prisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 50000 } });

      const result = await service.getPlatformOverview(dateRange);

      expect(result.users.total).toBe(1000);
      expect(result.users.new).toBe(100);
      expect(result.vendors.active).toBe(50);
      expect(result.products.total).toBe(500);
      expect(result.orders.count).toBe(200);
      expect(result.orders.revenue).toBe(50000);
    });
  });

  describe('getLowStockReport', () => {
    it('should return products below threshold', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Product 1', sku: 'SKU1', stock: 5, vendor: { id: 'v1', storeName: 'Store' } },
        { id: 'p2', name: 'Product 2', sku: 'SKU2', stock: 2, vendor: { id: 'v1', storeName: 'Store' } },
      ]);

      const result = await service.getLowStockReport(10);

      expect(result).toHaveLength(2);
      expect(result[0].stock).toBeLessThanOrEqual(10);
    });
  });

  describe('generateReport', () => {
    it('should route to correct report generator', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.generateReport({
        type: ReportType.SALES_SUMMARY,
        dateRange: {
          startDate: new Date(),
          endDate: new Date(),
        },
      });

      expect(prisma.order.findMany).toHaveBeenCalled();
    });

    it('should throw for unknown report type', async () => {
      await expect(
        service.generateReport({
          type: 'UNKNOWN_TYPE' as ReportType,
          dateRange: { startDate: new Date(), endDate: new Date() },
        }),
      ).rejects.toThrow();
    });
  });

  describe('exportReport', () => {
    it('should export as JSON by default', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Product 1', stock: 5 },
      ]);

      const result = await service.exportReport(
        {
          type: ReportType.LOW_STOCK,
          dateRange: { startDate: new Date(), endDate: new Date() },
        },
        'json',
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should export as CSV when specified', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Product 1', stock: 5, sku: 'SKU1' },
      ]);

      const result = await service.exportReport(
        {
          type: ReportType.LOW_STOCK,
          dateRange: { startDate: new Date(), endDate: new Date() },
        },
        'csv',
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('id');
    });
  });
});
