import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutStatus, Prisma } from '@prisma/client';

export interface PayoutFilters {
  status?: PayoutStatus;
  vendorId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface ProcessPayoutDto {
  payoutId: string;
  transactionId: string;
  notes?: string;
}

export interface PayoutStats {
  totalPayouts: number;
  totalAmount: number;
  pendingAmount: number;
  processingAmount: number;
  completedThisMonth: number;
  totalVendors: number;
}

@Injectable()
export class AdminPayoutsService {
  private readonly logger = new Logger(AdminPayoutsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all payouts with filters and pagination
   */
  async getPayouts(
    filters: PayoutFilters,
    page: number = 1,
    limit: number = 20,
  ) {
    const where: Prisma.VendorPayoutWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters.search) {
      where.OR = [
        {
          Vendor: {
            name: { contains: filters.search, mode: 'insensitive' },
          },
        },
        {
          transactionId: { contains: filters.search, mode: 'insensitive' },
        },
      ];
    }

    const [payouts, total] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        where,
        include: {
          Vendor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendorPayout.count({ where }),
    ]);

    return {
      data: payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payout statistics for dashboard
   */
  async getPayoutStats(): Promise<PayoutStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalPayouts,
      totalAmount,
      pendingAmount,
      processingAmount,
      completedThisMonth,
      totalVendors,
    ] = await Promise.all([
      this.prisma.vendorPayout.count(),
      this.prisma.vendorPayout.aggregate({
        where: { status: PayoutStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.vendorPayout.aggregate({
        where: { status: PayoutStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.vendorPayout.aggregate({
        where: { status: PayoutStatus.PROCESSING },
        _sum: { amount: true },
      }),
      this.prisma.vendorPayout.count({
        where: {
          status: PayoutStatus.COMPLETED,
          processedAt: { gte: startOfMonth },
        },
      }),
      this.prisma.vendor.count({
        where: {
          VendorPayout: { some: {} },
        },
      }),
    ]);

    return {
      totalPayouts,
      totalAmount: totalAmount._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
      processingAmount: processingAmount._sum.amount || 0,
      completedThisMonth,
      totalVendors,
    };
  }

  /**
   * Get single payout by ID with details
   */
  async getPayoutById(payoutId: string) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            bankDetails: true,
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }

  /**
   * Process a payout (mark as processing/completed)
   */
  async processPayout(adminId: string, dto: ProcessPayoutDto) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: dto.payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status === PayoutStatus.COMPLETED) {
      throw new BadRequestException('Payout is already completed');
    }

    const updated = await this.prisma.vendorPayout.update({
      where: { id: dto.payoutId },
      data: {
        status: PayoutStatus.COMPLETED,
        transactionId: dto.transactionId,
        processedAt: new Date(),
      },
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update vendor's last payout date
    await this.prisma.vendor.update({
      where: { id: payout.vendorId },
      data: { lastPayoutDate: new Date() },
    });

    this.logger.log(`Payout ${dto.payoutId} processed by admin ${adminId}`);
    return updated;
  }

  /**
   * Mark payout as processing
   */
  async markAsProcessing(payoutId: string) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Only pending payouts can be marked as processing');
    }

    return this.prisma.vendorPayout.update({
      where: { id: payoutId },
      data: { status: PayoutStatus.PROCESSING },
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Reject or fail a payout
   */
  async failPayout(payoutId: string, reason?: string) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return this.prisma.vendorPayout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.FAILED,
      },
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get pending payouts summary
   */
  async getPendingPayoutsSummary() {
    const payouts = await this.prisma.vendorPayout.findMany({
      where: { status: PayoutStatus.PENDING },
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            storeLogo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);

    return {
      payouts,
      count: payouts.length,
      totalAmount,
    };
  }

  /**
   * Get payout trends for charts
   */
  async getPayoutTrends(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const payouts = await this.prisma.vendorPayout.findMany({
      where: {
        createdAt: { gte: startDate },
        status: PayoutStatus.COMPLETED,
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped = payouts.reduce((acc, payout) => {
      const date = payout.createdAt.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date] += payout.amount;
      return acc;
    }, {} as Record<string, number>);

    // Fill in missing dates
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        amount: grouped[dateStr] || 0,
      });
    }

    return result;
  }
}
