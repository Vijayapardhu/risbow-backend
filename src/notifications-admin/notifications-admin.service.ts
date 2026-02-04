import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class NotificationsAdminService {
  private readonly logger = new Logger(NotificationsAdminService.name);

  constructor(private prisma: PrismaService) {}

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
    const [totalSent, totalOpened, totalClicked, templates, campaigns] = await Promise.all([
      this.prisma.notificationCampaign.aggregate({ _sum: { totalSent: true } }),
      this.prisma.notificationCampaign.aggregate({ _sum: { totalOpened: true } }),
      this.prisma.notificationCampaign.aggregate({ _sum: { totalClicked: true } }),
      this.prisma.notificationTemplate.count(),
      this.prisma.notificationCampaign.count()
    ]);

    return {
      totalSent: totalSent._sum.totalSent || 0,
      totalOpened: totalOpened._sum.totalOpened || 0,
      totalClicked: totalClicked._sum.totalClicked || 0,
      templates,
      campaigns
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
