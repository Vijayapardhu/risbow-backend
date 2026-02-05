import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import {
  VendorOrderQueryDto,
  UpdateOrderStatusDto,
  UpdateTrackingDto,
  CancelOrderDto,
  OrderTimelineEntry,
} from './dto/vendor-order.dto';

// Valid status transitions for vendors
const VENDOR_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED'],
  CONFIRMED: ['PACKED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
};

@Injectable()
export class VendorOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List orders belonging to a vendor with pagination and filters
   */
  async findAll(vendorId: string, query: VendorOrderQueryDto) {
    const { page = 1, limit = 10, status, dateFrom, dateTo, search } = query;
    const skip = (page - 1) * limit;

    // Get all orders and filter by vendor items
    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo);
      }
    }

    if (search) {
      whereClause.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get orders with items containing this vendor
    const allOrders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter orders that contain items from this vendor
    const vendorOrders = allOrders.filter((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      return items.some((item: any) => item.vendorId === vendorId);
    });

    const total = vendorOrders.length;
    const paginatedOrders = vendorOrders.slice(skip, skip + limit);

    // Transform orders for vendor view
    const transformedOrders = paginatedOrders.map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const vendorItems = items.filter((item: any) => item.vendorId === vendorId);

      const vendorTotal = vendorItems.reduce(
        (sum: number, item: any) =>
          sum + (item.price || item.unitPrice || 0) * (item.quantity || 1),
        0,
      );

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        confirmedAt: order.confirmedAt,
        deliveredAt: order.deliveredAt,
        customer: order.user
          ? {
              id: order.user.id,
              name: order.user.name,
              phone: order.user.phone,
            }
          : null,
        itemCount: vendorItems.length,
        vendorTotal,
        trackingNumber: order.trackingId,
        carrier: order.courierPartner,
        awbNumber: order.awbNumber,
      };
    });

    return {
      orders: transformedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order details with vendor-specific items
   */
  async findOne(vendorId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        address: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify vendor owns items in this order
    const items = Array.isArray(order.items) ? order.items : [];
    const vendorItems = items.filter((item: any) => item.vendorId === vendorId);

    if (vendorItems.length === 0) {
      throw new ForbiddenException('Order does not belong to this vendor');
    }

    // Fetch product details for items
    const productIds = vendorItems
      .map((item: any) => item.productId)
      .filter(Boolean);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        images: true,
        sku: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const transformedItems = vendorItems.map((item: any, index: number) => {
      const product = productMap.get(item.productId);
      return {
        id: `${order.id}-item-${index}`,
        productId: item.productId,
        productName: item.productName || item.title || product?.title || 'Product',
        productImage: item.image || product?.images?.[0] || '',
        sku: item.sku || product?.sku || '',
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity || 1,
        unitPrice: item.price || item.unitPrice || 0,
        total: (item.price || item.unitPrice || 0) * (item.quantity || 1),
      };
    });

    const vendorTotal = transformedItems.reduce((sum, item) => sum + item.total, 0);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      confirmedAt: order.confirmedAt,
      deliveredAt: order.deliveredAt,
      customer: order.user
        ? {
            id: order.user.id,
            name: order.user.name,
            email: order.user.email,
            phone: order.user.phone,
          }
        : null,
      shippingAddress: order.address,
      items: transformedItems,
      vendorTotal,
      trackingNumber: order.trackingId,
      carrier: order.courierPartner,
      awbNumber: order.awbNumber,
      payment: order.payment
        ? {
            status: order.payment.status,
            method: order.payment.method,
          }
        : null,
    };
  }

  /**
   * Update order status with validation
   */
  async updateStatus(
    vendorId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.verifyOrderOwnership(vendorId, orderId);

    // Validate status transition
    const currentStatus = order.status as string;
    const newStatus = dto.status as string;

    const allowedTransitions = VENDOR_STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }

    // Prepare update data
    const updateData: any = {
      status: dto.status,
      updatedAt: new Date(),
    };

    if (dto.status === OrderStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    } else if (dto.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    // Update order
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Create audit log entry for timeline
    await this.createTimelineEntry(orderId, vendorId, dto.status, dto.note);

    return {
      success: true,
      message: `Order status updated to ${dto.status}`,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
      },
    };
  }

  /**
   * Add tracking information to order
   */
  async updateTracking(
    vendorId: string,
    orderId: string,
    dto: UpdateTrackingDto,
  ) {
    const order = await this.verifyOrderOwnership(vendorId, orderId);

    // Only allow tracking update for PACKED or SHIPPED orders
    if (
      order.status !== OrderStatus.PACKED &&
      order.status !== OrderStatus.SHIPPED
    ) {
      throw new BadRequestException(
        'Tracking can only be added for PACKED or SHIPPED orders',
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        trackingId: dto.trackingNumber,
        courierPartner: dto.carrier,
        updatedAt: new Date(),
      },
    });

    // Create audit log entry
    await this.createTimelineEntry(
      orderId,
      vendorId,
      order.status,
      `Tracking added: ${dto.carrier} - ${dto.trackingNumber}`,
    );

    return {
      success: true,
      message: 'Tracking information updated',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        trackingNumber: updatedOrder.trackingId,
        carrier: updatedOrder.courierPartner,
      },
    };
  }

  /**
   * Cancel order with reason and restore stock
   */
  async cancelOrder(vendorId: string, orderId: string, dto: CancelOrderDto) {
    const order = await this.verifyOrderOwnership(vendorId, orderId);

    // Validate cancellation is allowed
    const cancellableStatuses = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PACKED,
    ];

    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        `Cannot cancel order in ${order.status} status`,
      );
    }

    // Get vendor items from this order
    const items = Array.isArray(order.items) ? order.items : [];
    const vendorItems = items.filter((item: any) => item.vendorId === vendorId);

    // Restore stock for vendor items
    for (const item of vendorItems) {
      if (item.productId && item.quantity) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }
    }

    // Update order status
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    // Create audit log entry
    await this.createTimelineEntry(
      orderId,
      vendorId,
      OrderStatus.CANCELLED,
      `Cancelled by vendor: ${dto.reason}`,
    );

    return {
      success: true,
      message: 'Order cancelled successfully',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
      },
      stockRestored: vendorItems.length,
    };
  }

  /**
   * Verify order belongs to vendor
   */
  private async verifyOrderOwnership(vendorId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const hasVendorItems = items.some((item: any) => item.vendorId === vendorId);

    if (!hasVendorItems) {
      throw new ForbiddenException('Order does not belong to this vendor');
    }

    return order;
  }

  /**
   * Create timeline entry using AuditLog
   */
  private async createTimelineEntry(
    orderId: string,
    vendorId: string,
    status: OrderStatus,
    note?: string,
  ) {
    const id = `ol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.prisma.auditLog.create({
      data: {
        id,
        adminId: vendorId,
        entity: 'Order',
        entityId: orderId,
        action: `STATUS_CHANGE_${status}`,
        details: {
          status,
          note,
          timestamp: new Date().toISOString(),
          actorType: 'VENDOR',
        } as any,
      },
    });
  }

  /**
   * Get order timeline/history
   */
  async getOrderTimeline(vendorId: string, orderId: string): Promise<OrderTimelineEntry[]> {
    await this.verifyOrderOwnership(vendorId, orderId);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        entity: 'Order',
        entityId: orderId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => {
      const details = log.details as any;
      return {
        status: details?.status || OrderStatus.PENDING,
        note: details?.note,
        timestamp: log.createdAt,
        actor: log.adminId,
        actorType: details?.actorType || 'SYSTEM',
      };
    });
  }
}
