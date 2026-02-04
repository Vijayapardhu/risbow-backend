import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { RefundQueryDto } from './dto/refund-query.dto';
import { RefundStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRefundDto, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { user: true }
    });

    if (!order) throw new NotFoundException('Order not found');

    const refundNumber = `REF-${Date.now()}-${order.id.slice(-4)}`.toUpperCase();

    return this.prisma.refund.create({
      data: {
        id: randomUUID(),
        refundNumber,
        userId: order.userId,
        orderId: dto.orderId,
        returnId: dto.returnId,
        amount: dto.amount,
        reason: dto.reason,
        method: dto.method,
        notes: dto.notes,
        status: RefundStatus.PENDING,
        updatedAt: new Date(),
      } as any,
      include: {
        Order: { select: { id: true, totalAmount: true, status: true } },
        User: { select: { id: true, name: true, email: true, mobile: true } },
        ReturnRequest: { select: { id: true, returnNumber: true, status: true } }
      }
    });
  }

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

  async findOne(id: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        Order: true,
        User: true,
        ReturnRequest: true
      }
    });

    if (!refund) throw new NotFoundException('Refund not found');
    return refund;
  }

  async processRefund(id: string, dto: ProcessRefundDto, adminId: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) throw new NotFoundException('Refund not found');

    if (refund.status === RefundStatus.PROCESSED) {
      throw new BadRequestException('Refund has already been processed');
    }

    const updateData: Prisma.RefundUpdateInput = {
      status: dto.status,
      processedBy: adminId,
      processedAt: new Date()
    };

    if (dto.transactionId) updateData.transactionId = dto.transactionId;
    if (dto.rejectionReason) updateData.rejectionReason = dto.rejectionReason;
    if (dto.notes) updateData.notes = dto.notes;

    return this.prisma.refund.update({
      where: { id },
      data: updateData,
      include: {
        Order: { select: { id: true, totalAmount: true, status: true } },
        User: { select: { id: true, name: true, email: true, mobile: true } }
      }
    });
  }

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

  async rejectRefund(id: string, rejectionReason: string, adminId: string) {
    return this.processRefund(id, {
      status: RefundStatus.REJECTED,
      rejectionReason
    }, adminId);
  }
}
