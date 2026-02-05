import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  VendorNotificationQueryDto,
  VendorNotificationType,
} from './dto/vendor-notification.dto';

@Injectable()
export class VendorNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List notifications for a vendor with pagination
   */
  async findAll(vendorId: string, query: VendorNotificationQueryDto) {
    const { page = 1, limit = 20, type, isRead } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: vendorId,
    };

    if (type) {
      whereClause.type = type;
    }

    if (isRead !== undefined) {
      whereClause.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: whereClause }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count for a vendor
   */
  async getUnreadCount(vendorId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId: vendorId,
        isRead: false,
      },
    });

    return { unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(vendorId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== vendorId) {
      throw new ForbiddenException('Notification does not belong to this vendor');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { success: true, count: 1 };
  }

  /**
   * Mark all notifications as read for a vendor
   */
  async markAllAsRead(vendorId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: vendorId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true, count: result.count };
  }

  /**
   * Delete a notification
   */
  async delete(vendorId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== vendorId) {
      throw new ForbiddenException('Notification does not belong to this vendor');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  /**
   * Create a new order notification for a vendor
   */
  async createOrderNotification(
    vendorId: string,
    orderId: string,
    message: string,
  ) {
    return this.prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: vendorId,
        title: 'New Order Received',
        body: message || `You have received a new order: ${orderId}`,
        type: VendorNotificationType.ORDER_NEW,
        isRead: false,
      },
    });
  }

  /**
   * Create a low stock notification for a vendor
   */
  async createLowStockNotification(
    vendorId: string,
    productId: string,
    productName: string,
    stock: number,
  ) {
    return this.prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: vendorId,
        title: 'Low Stock Alert',
        body: `Product "${productName}" (ID: ${productId}) has low stock: ${stock} units remaining`,
        type: VendorNotificationType.STOCK_LOW,
        isRead: false,
      },
    });
  }

  /**
   * Create a return request notification for a vendor
   */
  async createReturnNotification(
    vendorId: string,
    returnId: string,
    message: string,
  ) {
    return this.prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: vendorId,
        title: 'Return Request',
        body: message || `A return request has been created: ${returnId}`,
        type: VendorNotificationType.RETURN_REQUEST,
        isRead: false,
      },
    });
  }

  /**
   * Create a payout notification for a vendor
   */
  async createPayoutNotification(
    vendorId: string,
    payoutId: string,
    amount: number,
    status: string,
  ) {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount / 100);

    return this.prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: vendorId,
        title: 'Payout Update',
        body: `Payout ${payoutId} of ${formattedAmount} is ${status.toLowerCase()}`,
        type: VendorNotificationType.PAYOUT_COMPLETED,
        isRead: false,
      },
    });
  }

  /**
   * Create a new review notification for a vendor
   */
  async createReviewNotification(
    vendorId: string,
    productId: string,
    productName: string,
    rating: number,
  ) {
    return this.prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: vendorId,
        title: 'New Review',
        body: `Your product "${productName}" received a ${rating}-star review`,
        type: VendorNotificationType.REVIEW_NEW,
        isRead: false,
      },
    });
  }
}
