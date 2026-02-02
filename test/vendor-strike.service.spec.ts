import { Test, TestingModule } from '@nestjs/testing';
import { VendorStrikeService } from '../src/admin/strikes/vendor-strike.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock Prisma Service
const mockPrismaService = {
  vendorStrike: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  vendor: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  adminAuditLog: {
    create: jest.fn(),
  },
};

describe('VendorStrikeService', () => {
  let service: VendorStrikeService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorStrikeService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VendorStrikeService>(VendorStrikeService);
    prisma = mockPrismaService;

    jest.clearAllMocks();
  });

  describe('issueStrike', () => {
    const mockVendor = {
      id: 'vendor-123',
      storeName: 'Test Store',
      isActive: true,
      suspendedUntil: null,
    };

    it('should issue a strike successfully', async () => {
      prisma.vendor.findUnique.mockResolvedValue(mockVendor);
      prisma.vendorStrike.create.mockResolvedValue({
        id: 'strike-123',
        vendorId: 'vendor-123',
        type: 'WARNING',
        reason: 'Test reason',
        points: 1,
      });
      prisma.vendorStrike.aggregate.mockResolvedValue({ _sum: { points: 1 } });
      prisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.issueStrike({
        vendorId: 'vendor-123',
        type: 'WARNING',
        reason: 'Test reason',
        issuedById: 'admin-123',
      });

      expect(result.id).toBe('strike-123');
      expect(prisma.vendorStrike.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent vendor', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);

      await expect(
        service.issueStrike({
          vendorId: 'invalid-vendor',
          type: 'WARNING',
          reason: 'Test',
          issuedById: 'admin-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should auto-suspend vendor after threshold', async () => {
      prisma.vendor.findUnique.mockResolvedValue(mockVendor);
      prisma.vendorStrike.create.mockResolvedValue({
        id: 'strike-123',
        vendorId: 'vendor-123',
        type: 'POLICY_VIOLATION',
        points: 2,
      });
      prisma.vendorStrike.aggregate.mockResolvedValue({ _sum: { points: 3 } }); // Hits threshold
      prisma.vendor.update.mockResolvedValue({});
      prisma.adminAuditLog.create.mockResolvedValue({});

      await service.issueStrike({
        vendorId: 'vendor-123',
        type: 'POLICY_VIOLATION',
        reason: 'Repeated violations',
        issuedById: 'admin-123',
      });

      // Should trigger auto-suspension
      expect(prisma.vendor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vendor-123' },
          data: expect.objectContaining({
            suspendedUntil: expect.any(Date),
          }),
        }),
      );
    });

    it('should permanently ban vendor at 5+ points', async () => {
      prisma.vendor.findUnique.mockResolvedValue(mockVendor);
      prisma.vendorStrike.create.mockResolvedValue({
        id: 'strike-123',
        vendorId: 'vendor-123',
        type: 'FRAUD',
        points: 5,
      });
      prisma.vendorStrike.aggregate.mockResolvedValue({ _sum: { points: 5 } });
      prisma.vendor.update.mockResolvedValue({});
      prisma.adminAuditLog.create.mockResolvedValue({});

      await service.issueStrike({
        vendorId: 'vendor-123',
        type: 'FRAUD',
        reason: 'Fraudulent activity',
        issuedById: 'admin-123',
      });

      expect(prisma.vendor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vendor-123' },
          data: expect.objectContaining({
            isActive: false,
            isBanned: true,
          }),
        }),
      );
    });
  });

  describe('fileAppeal', () => {
    const mockStrike = {
      id: 'strike-123',
      vendorId: 'vendor-123',
      appealStatus: 'NONE',
      isVoided: false,
    };

    it('should file an appeal successfully', async () => {
      prisma.vendorStrike.findUnique.mockResolvedValue(mockStrike);
      prisma.vendorStrike.update.mockResolvedValue({
        ...mockStrike,
        appealStatus: 'PENDING',
        appealReason: 'I disagree with this',
      });

      const result = await service.fileAppeal(
        'strike-123',
        'vendor-123',
        'I disagree with this',
      );

      expect(result.appealStatus).toBe('PENDING');
    });

    it('should throw for already appealed strike', async () => {
      prisma.vendorStrike.findUnique.mockResolvedValue({
        ...mockStrike,
        appealStatus: 'PENDING',
      });

      await expect(
        service.fileAppeal('strike-123', 'vendor-123', 'Another appeal'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for voided strike', async () => {
      prisma.vendorStrike.findUnique.mockResolvedValue({
        ...mockStrike,
        isVoided: true,
      });

      await expect(
        service.fileAppeal('strike-123', 'vendor-123', 'Appeal voided strike'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveAppeal', () => {
    const mockStrike = {
      id: 'strike-123',
      vendorId: 'vendor-123',
      appealStatus: 'PENDING',
      points: 2,
    };

    it('should approve appeal and void strike', async () => {
      prisma.vendorStrike.findUnique.mockResolvedValue(mockStrike);
      prisma.vendorStrike.update.mockResolvedValue({
        ...mockStrike,
        appealStatus: 'APPROVED',
        isVoided: true,
      });
      prisma.vendorStrike.aggregate.mockResolvedValue({ _sum: { points: 0 } });
      prisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.resolveAppeal(
        'strike-123',
        'APPROVED',
        'Appeal reason valid',
        'admin-123',
      );

      expect(result.appealStatus).toBe('APPROVED');
      expect(result.isVoided).toBe(true);
    });

    it('should reject appeal without voiding strike', async () => {
      prisma.vendorStrike.findUnique.mockResolvedValue(mockStrike);
      prisma.vendorStrike.update.mockResolvedValue({
        ...mockStrike,
        appealStatus: 'REJECTED',
        isVoided: false,
      });
      prisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.resolveAppeal(
        'strike-123',
        'REJECTED',
        'Appeal lacks merit',
        'admin-123',
      );

      expect(result.appealStatus).toBe('REJECTED');
      expect(result.isVoided).toBe(false);
    });

    it('should throw for non-pending appeal', async () => {
      prisma.vendorStrike.findUnique.mockResolvedValue({
        ...mockStrike,
        appealStatus: 'APPROVED',
      });

      await expect(
        service.resolveAppeal('strike-123', 'REJECTED', 'Reason', 'admin-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
