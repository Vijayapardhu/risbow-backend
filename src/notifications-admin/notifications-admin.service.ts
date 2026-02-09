import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class NotificationsAdminService {
  private readonly logger = new Logger(NotificationsAdminService.name);

  constructor(private prisma: PrismaService) {}

  // Individual Notifications CRUD
  async findAllNotifications(query: {
    page?: number;
    limit?: number;
    userId?: string;
    type?: string;
    isRead?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 10, userId, type, isRead, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {};
    
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
        User: {
          select: {
            id: true,
            email: true,
            mobile: true,
            name: true
          }
        }
        }
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

  async findNotificationById(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            mobile: true,
            name: true
          }
        }
      }
    });
    
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async createNotification(data: {
    title: string;
    body: string;
    userId?: string;
    type?: string;
    data?: Record<string, any>;
    imageUrl?: string;
    action?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        id: randomUUID(),
        title: data.title,
        body: data.body,
        userId: data.userId,
        type: data.type || 'PUSH',
        isRead: false,
        createdAt: new Date()
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            mobile: true,
            name: true
          }
        }
      }
    });
  }

  async updateNotification(id: string, data: Partial<{
    title: string;
    body: string;
    isRead: boolean;
    data?: Record<string, any>;
    imageUrl?: string;
    action?: string;
  }>) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data,
      include: {
        User: {
          select: {
            id: true,
            email: true,
            mobile: true,
            name: true
          }
        }
      }
    });
  }

  async deleteNotification(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted successfully', id };
  }

  async broadcastNotification(data: {
    title: string;
    body: string;
    targetAudience?: {
      roles?: string[];
      status?: string[];
      userIds?: string[];
    };
    imageUrl?: string;
    action?: string;
    data?: Record<string, any>;
    createdBy: string;
  }) {
    // Determine target users
    let targetUsers: { id: string }[] = [];
    
    if (data.targetAudience?.userIds?.length) {
      // Use specific user IDs
      targetUsers = data.targetAudience.userIds.map(id => ({ id }));
    } else {
      // Query users based on audience filters
      const where: Prisma.UserWhereInput = {};
      
      if (data.targetAudience?.roles?.length) {
        where.role = { in: data.targetAudience.roles as any };
      }
      
      if (data.targetAudience?.status?.length) {
        where.status = { in: data.targetAudience.status as any };
      }

      targetUsers = await this.prisma.user.findMany({
        where,
        select: { id: true }
      });
    }

    // Create campaign record
    const campaign = await this.createCampaign({
      name: `Broadcast-${Date.now()}`,
      title: data.title,
      body: data.body,
      imageUrl: data.imageUrl,
      targetAudience: data.targetAudience || { all: true },
      createdBy: data.createdBy
    });

    // Create notifications in database for all target users
    const batchSize = 1000;
    let createdCount = 0;

    for (let i = 0; i < targetUsers.length; i += batchSize) {
      const batch = targetUsers.slice(i, i + batchSize);
      
      await this.prisma.notification.createMany({
        data: batch.map(user => ({
          id: randomUUID(),
          userId: user.id,
          title: data.title,
          body: data.body,
          type: 'BROADCAST',
          isRead: false,
          createdAt: new Date()
        })),
        skipDuplicates: true
      });

      createdCount += batch.length;
      this.logger.log(`Created ${createdCount}/${targetUsers.length} notifications`);
    }

    // Update campaign status
    await this.prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        totalSent: createdCount
      }
    });

    // TODO: Integrate with push notification service (FCM, OneSignal, etc.)
    // await this.pushNotificationService.sendToUsers(targetUsers, {
    //   title: data.title,
    //   body: data.body,
    //   imageUrl: data.imageUrl,
    //   action: data.action,
    //   data: data.data
    // });

    return {
      message: 'Broadcast notification sent successfully',
      recipientsCount: createdCount,
      campaignId: campaign.id
    };
  }

  // Templates
  async createTemplate(data: { name: string; title: string; body: string; imageUrl?: string; action?: string; data?: any }) {
    return this.prisma.notificationTemplate.create({
      data: {
        id: randomUUID(),
        name: data.name,
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl,
        action: data.action,
        data: data.data || {},
        updatedAt: new Date()
      }
    });
  }

  async findAllTemplates(query: { page?: number; limit?: number; isActive?: boolean }) {
    const { page = 1, limit = 10, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationTemplateWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [total, data] = await Promise.all([
      this.prisma.notificationTemplate.count({ where }),
      this.prisma.notificationTemplate.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    };
  }

  async findTemplateById(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, data: Partial<{ name: string; title: string; body: string; imageUrl?: string; action?: string; isActive?: boolean }>) {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.notificationTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');

    await this.prisma.notificationTemplate.delete({ where: { id } });
    return { message: 'Template deleted successfully' };
  }

  // Campaigns
  async createCampaign(data: {
    name: string;
    title: string;
    body: string;
    imageUrl?: string;
    targetAudience: any;
    scheduledAt?: Date;
    createdBy: string;
  }) {
    return this.prisma.notificationCampaign.create({
      data: {
        id: randomUUID(),
        name: data.name,
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl,
        targetAudience: data.targetAudience,
        scheduledAt: data.scheduledAt,
        status: data.scheduledAt ? 'scheduled' : 'draft',
        createdBy: data.createdBy,
        updatedAt: new Date()
      }
    });
  }

  async findAllCampaigns(query: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationCampaignWhereInput = {};
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      this.prisma.notificationCampaign.count({ where }),
      this.prisma.notificationCampaign.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    };
  }

  async sendNotification(data: {
    title: string;
    body: string;
    imageUrl?: string;
    userIds?: string[];
    targetAudience?: any;
  }) {
    // Placeholder for actual push notification logic
    // In real implementation, this would use FCM or similar service
    this.logger.log(`Sending notification: ${data.title}`);

    let targetUsers: string[] = data.userIds || [];

    if (!targetUsers.length && data.targetAudience) {
      const users = await this.prisma.user.findMany({
        where: this.buildAudienceFilter(data.targetAudience),
        select: { id: true }
      });
      targetUsers = users.map(u => u.id);
    }

    // Create notifications in database
    const notifications = await Promise.all(
      targetUsers.map(userId =>
        this.prisma.notification.create({
          data: {
            id: randomUUID(),
            userId,
            title: data.title,
            body: data.body,
            type: 'PUSH'
          }
        })
      )
    );

    return {
      message: 'Notification sent successfully',
      recipientsCount: notifications.length
    };
  }

  async sendBulkNotification(data: {
    title: string;
    body: string;
    targetAudience: any;
    createdBy: string;
  }) {
    // Create campaign record
    const campaign = await this.createCampaign({
      name: `Bulk-${Date.now()}`,
      title: data.title,
      body: data.body,
      targetAudience: data.targetAudience,
      createdBy: data.createdBy
    });

    // Send notifications
    const result = await this.sendNotification({
      title: data.title,
      body: data.body,
      targetAudience: data.targetAudience
    });

    // Update campaign status
    await this.prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        totalSent: result.recipientsCount
      }
    });

    return result;
  }

  async getStats() {
    const [totalSent, totalOpened, totalClicked, templates, campaigns, totalNotifications] = await Promise.all([
      this.prisma.notificationCampaign.aggregate({ _sum: { totalSent: true } }),
      this.prisma.notificationCampaign.aggregate({ _sum: { totalOpened: true } }),
      this.prisma.notificationCampaign.aggregate({ _sum: { totalClicked: true } }),
      this.prisma.notificationTemplate.count(),
      this.prisma.notificationCampaign.count(),
      this.prisma.notification.count()
    ]);

    return {
      totalSent: totalSent._sum.totalSent || 0,
      totalOpened: totalOpened._sum.totalOpened || 0,
      totalClicked: totalClicked._sum.totalClicked || 0,
      templates,
      campaigns,
      totalNotifications
    };
  }

  private buildAudienceFilter(audience: any): Prisma.UserWhereInput {
    const filter: Prisma.UserWhereInput = {};

    if (audience.role && audience.role.length) {
      filter.role = { in: audience.role };
    }

    if (audience.status && audience.status.length) {
      filter.status = { in: audience.status };
    }

    return filter;
  }
}
