import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReturnStatus, RefundStatus, RefundMethod } from '@prisma/client';
import {
  VendorReturnQueryDto,
  AcceptReturnDto,
  RejectReturnDto,
  ProcessRefundDto,
  ReturnStatsResponse,
} from './dto/vendor-return.dto';

// Valid status transitions for vendor return handling
const RETURN_STATUS_TRANSITIONS: Record<string, ReturnStatus[]> = {
  PENDING_APPROVAL: [ReturnStatus.APPROVED, ReturnStatus.REJECTED],
  APPROVED: [ReturnStatus.PICKUP_SCHEDULED, ReturnStatus.REFUND_INITIATED],
  PICKUP_COMPLETED: [ReturnStatus.IN_TRANSIT],
  RECEIVED_AT_WAREHOUSE: [ReturnStatus.QC_IN_PROGRESS],
  QC_PASSED: [ReturnStatus.REFUND_INITIATED, ReturnStatus.REPLACEMENT_INITIATED],
  REFUND_INITIATED: [ReturnStatus.REFUND_COMPLETED],
};

@Injectable()
export class VendorReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List return requests for vendor's orders with pagination and filters
   */
  async findAll(vendorId: string, query: VendorReturnQueryDto) {
    const { page = 1, limit = 10, status, dateFrom, dateTo, search } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      vendorId,
    };

    if (status) {
      whereClause.status = status;
    }

    if (dateFrom || dateTo) {
      whereClause.requestedAt = {};
      if (dateFrom) {
        whereClause.requestedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.requestedAt.lte = new Date(dateTo);
      }
    }

    if (search) {
      whereClause.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' } },
        { Order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [returns, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where: whereClause,
        include: {
          Order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          ReturnItem: true,
          Refund: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.returnRequest.count({ where: whereClause }),
    ]);

    const transformedReturns = returns.map((ret) => ({
      id: ret.id,
      returnNumber: ret.returnNumber,
      status: ret.status,
      reason: ret.reason,
      description: ret.description,
      requestedAt: ret.requestedAt,
      updatedAt: ret.updatedAt,
      order: ret.Order
        ? {
            id: ret.Order.id,
            orderNumber: ret.Order.orderNumber,
            status: ret.Order.status,
          }
        : null,
      customer: ret.User
        ? {
            id: ret.User.id,
            name: ret.User.name,
            phone: ret.User.phone,
          }
        : null,
      itemCount: ret.ReturnItem?.length || 0,
      refundAmount: ret.Refund?.reduce((sum, r) => sum + r.amount, 0) || 0,
      refundStatus: ret.Refund?.[0]?.status || null,
    }));

    return {
      returns: transformedReturns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get return request details
   */
  async findOne(vendorId: string, returnId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        Order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            items: true,
            createdAt: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        ReturnItem: true,
        Refund: true,
        ReturnTimeline: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    // Verify return belongs to vendor
    if (returnRequest.vendorId !== vendorId) {
      throw new ForbiddenException('Return request does not belong to this vendor');
    }

    return {
      id: returnRequest.id,
      returnNumber: returnRequest.returnNumber,
      status: returnRequest.status,
      reason: returnRequest.reason,
      description: returnRequest.description,
      evidenceImages: returnRequest.evidenceImages,
      evidenceVideo: returnRequest.evidenceVideo,
      requestedAt: returnRequest.requestedAt,
      updatedAt: returnRequest.updatedAt,
      approvedAt: returnRequest.approvedAt,
      rejectedAt: returnRequest.rejectedAt,
      completedAt: returnRequest.completedAt,
      pickupDate: returnRequest.pickupDate,
      pickupAddress: returnRequest.pickupAddress,
      courierPartner: returnRequest.courierPartner,
      trackingId: returnRequest.trackingId,
      qcNotes: returnRequest.qcNotes,
      order: returnRequest.Order
        ? {
            id: returnRequest.Order.id,
            orderNumber: returnRequest.Order.orderNumber,
            status: returnRequest.Order.status,
            createdAt: returnRequest.Order.createdAt,
          }
        : null,
      customer: returnRequest.User
        ? {
            id: returnRequest.User.id,
            name: returnRequest.User.name,
            email: returnRequest.User.email,
            phone: returnRequest.User.phone,
          }
        : null,
      items: returnRequest.ReturnItem,
      refunds: returnRequest.Refund?.map((r) => ({
        id: r.id,
        refundNumber: r.refundNumber,
        amount: r.amount,
        status: r.status,
        method: r.method,
        processedAt: r.processedAt,
      })),
      timeline: returnRequest.ReturnTimeline,
    };
  }

  /**
   * Accept a return request
   */
  async acceptReturn(vendorId: string, returnId: string, dto: AcceptReturnDto) {
    const returnRequest = await this.verifyReturnOwnership(vendorId, returnId);

    // Validate status transition
    if (returnRequest.status !== ReturnStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot accept return in ${returnRequest.status} status. Only PENDING_APPROVAL returns can be accepted.`,
      );
    }

    const updateData: any = {
      status: ReturnStatus.APPROVED,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };

    if (dto.pickupDate) {
      updateData.pickupDate = new Date(dto.pickupDate);
      updateData.status = ReturnStatus.PICKUP_SCHEDULED;
    }

    if (dto.notes) {
      updateData.qcNotes = dto.notes;
    }

    const updatedReturn = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: updateData,
    });

    // Create timeline entry
    await this.createTimelineEntry(
      returnId,
      vendorId,
      updatedReturn.status,
      dto.notes || 'Return request approved by vendor',
    );

    return {
      success: true,
      message: 'Return request accepted',
      return: {
        id: updatedReturn.id,
        returnNumber: updatedReturn.returnNumber,
        status: updatedReturn.status,
        approvedAt: updatedReturn.approvedAt,
        pickupDate: updatedReturn.pickupDate,
      },
    };
  }

  /**
   * Reject a return request
   */
  async rejectReturn(vendorId: string, returnId: string, dto: RejectReturnDto) {
    const returnRequest = await this.verifyReturnOwnership(vendorId, returnId);

    // Validate status transition
    if (returnRequest.status !== ReturnStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot reject return in ${returnRequest.status} status. Only PENDING_APPROVAL returns can be rejected.`,
      );
    }

    const updatedReturn = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: ReturnStatus.REJECTED,
        rejectedAt: new Date(),
        updatedAt: new Date(),
        qcNotes: dto.reason,
      },
    });

    // Create timeline entry
    await this.createTimelineEntry(
      returnId,
      vendorId,
      ReturnStatus.REJECTED,
      `Rejected: ${dto.reason}`,
    );

    return {
      success: true,
      message: 'Return request rejected',
      return: {
        id: updatedReturn.id,
        returnNumber: updatedReturn.returnNumber,
        status: updatedReturn.status,
        rejectedAt: updatedReturn.rejectedAt,
        rejectionReason: dto.reason,
      },
    };
  }

  /**
   * Process refund for a return request
   */
  async processRefund(vendorId: string, returnId: string, dto: ProcessRefundDto) {
    const returnRequest = await this.verifyReturnOwnership(vendorId, returnId);

    // Validate return is in approved/refundable state
    const refundableStatuses = [
      ReturnStatus.APPROVED,
      ReturnStatus.QC_PASSED,
      ReturnStatus.REFUND_INITIATED,
    ];

    if (!refundableStatuses.includes(returnRequest.status)) {
      throw new BadRequestException(
        `Cannot process refund for return in ${returnRequest.status} status. Return must be APPROVED, QC_PASSED, or REFUND_INITIATED.`,
      );
    }

    // Check if refund already exists and is completed
    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        returnId,
        status: RefundStatus.PROCESSED,
      },
    });

    if (existingRefund) {
      throw new BadRequestException('Refund has already been processed for this return');
    }

    // Create refund record
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const refundNumber = `RFD${Date.now()}`;

    const refund = await this.prisma.refund.create({
      data: {
        id: refundId,
        refundNumber,
        orderId: returnRequest.orderId,
        returnId,
        userId: returnRequest.userId,
        amount: dto.amount,
        reason: `Refund for return: ${returnRequest.returnNumber}`,
        status: RefundStatus.PROCESSED,
        method: dto.method || RefundMethod.ORIGINAL_PAYMENT,
        processedBy: vendorId,
        processedAt: new Date(),
        notes: dto.notes,
        updatedAt: new Date(),
      },
    });

    // Update return status
    await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: ReturnStatus.REFUND_COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create timeline entry
    await this.createTimelineEntry(
      returnId,
      vendorId,
      ReturnStatus.REFUND_COMPLETED,
      `Refund of ₹${(dto.amount / 100).toFixed(2)} processed via ${dto.method || 'ORIGINAL_PAYMENT'}`,
    );

    return {
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        refundNumber: refund.refundNumber,
        amount: refund.amount,
        status: refund.status,
        method: refund.method,
        processedAt: refund.processedAt,
      },
      return: {
        id: returnRequest.id,
        returnNumber: returnRequest.returnNumber,
        status: ReturnStatus.REFUND_COMPLETED,
      },
    };
  }

  /**
   * Get return statistics for vendor
   */
  async getStats(vendorId: string): Promise<ReturnStatsResponse> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      total,
      pending,
      approved,
      rejected,
      refundedReturns,
      refundStats,
      last30Days,
    ] = await Promise.all([
      this.prisma.returnRequest.count({ where: { vendorId } }),
      this.prisma.returnRequest.count({
        where: { vendorId, status: ReturnStatus.PENDING_APPROVAL },
      }),
      this.prisma.returnRequest.count({
        where: {
          vendorId,
          status: {
            in: [
              ReturnStatus.APPROVED,
              ReturnStatus.PICKUP_SCHEDULED,
              ReturnStatus.PICKUP_COMPLETED,
              ReturnStatus.IN_TRANSIT,
              ReturnStatus.RECEIVED_AT_WAREHOUSE,
              ReturnStatus.QC_IN_PROGRESS,
              ReturnStatus.QC_PASSED,
            ],
          },
        },
      }),
      this.prisma.returnRequest.count({
        where: { vendorId, status: ReturnStatus.REJECTED },
      }),
      this.prisma.returnRequest.count({
        where: { vendorId, status: ReturnStatus.REFUND_COMPLETED },
      }),
      this.prisma.refund.aggregate({
        where: {
          ReturnRequest: { vendorId },
          status: RefundStatus.PROCESSED,
        },
        _sum: { amount: true },
      }),
      this.prisma.returnRequest.count({
        where: {
          vendorId,
          requestedAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      refunded: refundedReturns,
      totalRefundAmount: refundStats._sum.amount || 0,
      last30Days,
    };
  }

  /**
   * Verify return request belongs to vendor
   */
  private async verifyReturnOwnership(vendorId: string, returnId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.vendorId !== vendorId) {
      throw new ForbiddenException('Return request does not belong to this vendor');
    }

    return returnRequest;
  }

  /**
   * Create timeline entry for return
   */
  private async createTimelineEntry(
    returnId: string,
    actorId: string,
    status: ReturnStatus,
    note: string,
  ) {
    const id = `rtl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.prisma.returnTimeline.create({
      data: {
        id,
        returnId,
        status,
        action: `STATUS_CHANGE_${status}`,
        performedBy: actorId,
        actorId,
        notes: note,
      },
    });
  }
}
