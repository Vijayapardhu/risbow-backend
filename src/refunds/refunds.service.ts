import { Injectable, NotImplementedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RefundQueryDto } from './dto/refund-query.dto';
import { RefundStatus, Prisma } from '@prisma/client';

/**
 * RefundsService — STRUCTURALLY BLOCKED
 * 
 * RISBOW enforces a REPLACEMENT-ONLY return policy.
 * Direct monetary refunds are forbidden by design.
 * 
 * This service retains read-only access to historical refund records
 * but all write operations (create, process, reject) are permanently blocked.
 * 
 * For returns, use the ReturnsService which creates replacement orders.
 * Any admin override requires explicit architectural approval and audit trail.
 */
@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * BLOCKED: Direct refunds violate RISBOW replacement-only policy.
   * Use ReturnsService.createReplacementOrder() instead.
   */
  async create(): Promise<never> {
    this.logger.error('Attempted to create a direct refund — this is structurally blocked');
    throw new NotImplementedException(
      'Direct refunds are structurally blocked. RISBOW uses replacement-only returns. ' +
      'Use the Returns module to initiate a replacement order.'
    );
  }

  /**
   * READ-ONLY: View historical refund records for audit purposes.
   */
  async findAll(query: RefundQueryDto) {
    const { page = 1, limit = 10, status, method, search, userId, orderId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RefundWhereInput = {};
    if (status) where.status = status;
    if (method) where.method = method;
    if (userId) where.userId = userId;
    if (orderId) where.orderId = orderId;
    if (search) {
      where.OR = [
        { refundNumber: { contains: search, mode: 'insensitive' } },
        { orderId: { contains: search, mode: 'insensitive' } },
        { transactionId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, data] = await Promise.all([
      this.prisma.refund.count({ where }),
      this.prisma.refund.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          Order: { select: { id: true, totalAmount: true, status: true } },
          User: { select: { id: true, name: true, email: true, mobile: true } },
          ReturnRequest: { select: { id: true, returnNumber: true, status: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * READ-ONLY: View a single historical refund record for audit purposes.
   */
  async findOne(id: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        Order: true,
        User: true,
        ReturnRequest: true
      }
    });

    if (!refund) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('Refund not found');
    }
    return refund;
  }

  /**
   * BLOCKED: Processing refunds violates RISBOW replacement-only policy.
   */
  async processRefund(): Promise<never> {
    this.logger.error('Attempted to process a refund — this is structurally blocked');
    throw new NotImplementedException(
      'Refund processing is structurally blocked. RISBOW uses replacement-only returns.'
    );
  }

  /**
   * READ-ONLY: Refund statistics for historical audit.
   */
  async getStats() {
    const [
      total,
      pending,
      approved,
      processed,
      rejected,
      failed,
      totalAmount
    ] = await Promise.all([
      this.prisma.refund.count(),
      this.prisma.refund.count({ where: { status: RefundStatus.PENDING } }),
      this.prisma.refund.count({ where: { status: RefundStatus.APPROVED } }),
      this.prisma.refund.count({ where: { status: RefundStatus.PROCESSED } }),
      this.prisma.refund.count({ where: { status: RefundStatus.REJECTED } }),
      this.prisma.refund.count({ where: { status: RefundStatus.FAILED } }),
      this.prisma.refund.aggregate({
        where: { status: RefundStatus.PROCESSED },
        _sum: { amount: true }
      })
    ]);

    return {
      total,
      byStatus: { pending, approved, processed, rejected, failed },
      totalRefundedAmount: totalAmount._sum.amount || 0,
      averageRefundAmount: processed > 0 ? (totalAmount._sum.amount || 0) / processed : 0
    };
  }

  /**
   * BLOCKED: Rejecting refunds implies refund processing exists.
   */
  async rejectRefund(): Promise<never> {
    this.logger.error('Attempted to reject a refund — this is structurally blocked');
    throw new NotImplementedException(
      'Refund operations are structurally blocked. RISBOW uses replacement-only returns.'
    );
  }
}
