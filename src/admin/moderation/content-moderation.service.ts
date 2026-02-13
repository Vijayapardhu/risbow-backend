import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContentFlagType,
  FlagReason,
  FlagPriority,
  FlagStatus,
  ModerationAction,
  Prisma,
  StrikeType,
} from '@prisma/client';
import { AdminAuditService, AuditActionType, AuditResourceType } from '../audit/admin-audit.service';
import { VendorStrikeService } from '../strikes/vendor-strike.service';
import { randomUUID } from 'crypto';

/**
 * Auto-flag keywords for content moderation
 */
const AUTO_FLAG_KEYWORDS = [
  // Prohibited content
  'counterfeit', 'fake', 'replica', 'knock-off',
  // Inappropriate
  'explicit', 'adult', 'xxx',
  // Safety concerns
  'dangerous', 'illegal', 'banned',
  // Spam indicators
  'limited offer', 'act now', 'buy now',
];

/**
 * Priority scoring based on flag reason
 */
const PRIORITY_SCORES: Record<FlagReason, number> = {
  [FlagReason.NUDITY]: 5,
  [FlagReason.VIOLENCE]: 5,
  [FlagReason.HATE_SPEECH]: 5,
  [FlagReason.COUNTERFEIT]: 4,
  [FlagReason.PROHIBITED_ITEM]: 5,
  [FlagReason.MISLEADING]: 2,
  [FlagReason.SPAM]: 1,
  [FlagReason.COPYRIGHT]: 3,
  [FlagReason.TRADEMARK]: 3,
  [FlagReason.HARASSMENT]: 4,
  [FlagReason.MISINFORMATION]: 3,
  [FlagReason.OTHER]: 1,
  [FlagReason.INAPPROPRIATE]: 3,
  [FlagReason.PROHIBITED]: 5,
  [FlagReason.OFFENSIVE]: 4,
  [FlagReason.LOW_QUALITY]: 1,
  [FlagReason.DUPLICATE]: 1,
};

interface CreateFlagDto {
  contentType: ContentFlagType;
  contentId: string;
  reason: FlagReason;
  description?: string;
  reportedBy?: string;
  isAutoFlagged?: boolean;
}

interface ModerateFlagDto {
  action: ModerationAction;
  notes?: string;
  issueStrike?: boolean;
  strikeType?: StrikeType;
  moderatedBy: string;
  moderatedByEmail?: string;
}

@Injectable()
export class ContentModerationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AdminAuditService,
    private strikeService: VendorStrikeService,
  ) {}

  /**
   * Create a content flag
   */
  async createFlag(dto: CreateFlagDto) {
    // Check if content exists based on type
    const contentExists = await this.verifyContentExists(dto.contentType, dto.contentId);
    if (!contentExists) {
      throw new NotFoundException('Content not found');
    }

    // Check for existing open flag
    const existingFlag = await this.prisma.contentFlag.findFirst({
      where: {
        contentType: dto.contentType,
        contentId: dto.contentId,
        status: { in: [FlagStatus.PENDING, FlagStatus.UNDER_REVIEW] },
      },
    });

    if (existingFlag) {
      // Increment report count instead of creating duplicate
      return this.prisma.contentFlag.update({
        where: { id: existingFlag.id },
        data: {
          reportCount: { increment: 1 },
          // Escalate priority if multiple reports
          priority: existingFlag.reportCount >= 3 ? FlagPriority.HIGH : existingFlag.priority,
        },
      });
    }

    // Calculate priority
    const priority = this.calculatePriority(dto.reason, dto.isAutoFlagged);

    // Get vendor ID if applicable
    const vendorId = await this.getVendorIdForContent(dto.contentType, dto.contentId);

    return this.prisma.contentFlag.create({
      data: {
        id: randomUUID(),
        contentType: dto.contentType,
        contentId: dto.contentId,
        Vendor: vendorId ? { connect: { id: vendorId } } : undefined,
        reason: dto.reason,
        description: dto.description,
        priority,
        reportedBy: dto.reportedBy,
        isAutoFlagged: dto.isAutoFlagged || false,
        reportCount: 1,
      },
    });
  }

  /**
   * Moderate a flagged content item
   */
  async moderateFlag(flagId: string, dto: ModerateFlagDto) {
    const flag = await this.prisma.contentFlag.findUnique({
      where: { id: flagId },
      include: { Vendor: true },
    });

    if (!flag) {
      throw new NotFoundException('Flag not found');
    }

    if (flag.status === FlagStatus.RESOLVED) {
      throw new BadRequestException('Flag already resolved');
    }

    // Execute moderation action
    await this.executeAction(flag, dto.action);

    // Update flag status
    const updatedFlag = await this.prisma.contentFlag.update({
      where: { id: flagId },
      data: {
        status: FlagStatus.RESOLVED,
        action: dto.action,
        moderationNotes: dto.notes,
        moderatedBy: dto.moderatedBy,
        moderatedAt: new Date(),
      },
    });

    // Issue strike if requested
    if (dto.issueStrike && flag.vendorId && dto.strikeType) {
      await this.strikeService.issueStrike({
        vendorId: flag.vendorId,
        type: dto.strikeType,
        reason: `Content moderation: ${flag.reason} - ${dto.notes || ''}`,
        issuedBy: dto.moderatedBy,
        issuedByEmail: dto.moderatedByEmail,
      });
    }

    // Log audit
    await this.auditService.log({
      adminId: dto.moderatedBy,
      adminEmail: dto.moderatedByEmail,
      action: this.getAuditActionForModerationAction(dto.action),
      resourceType: AuditResourceType.CONTENT,
      resourceId: flagId,
      details: {
        contentType: flag.contentType,
        contentId: flag.contentId,
        action: dto.action,
        reason: flag.reason,
        strikeIssued: dto.issueStrike,
      },
    });

    return updatedFlag;
  }

  /**
   * Assign flag for review
   */
  async assignFlag(flagId: string, adminId: string) {
    const flag = await this.prisma.contentFlag.findUnique({
      where: { id: flagId },
    });

    if (!flag) {
      throw new NotFoundException('Flag not found');
    }

    return this.prisma.contentFlag.update({
      where: { id: flagId },
      data: {
        status: FlagStatus.UNDER_REVIEW,
        assignedTo: adminId,
      },
    });
  }

  /**
   * Get flagged content queue
   */
  async getFlagQueue(options?: {
    contentType?: ContentFlagType;
    reason?: FlagReason;
    priority?: FlagPriority;
    status?: FlagStatus;
    vendorId?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      contentType,
      reason,
      priority,
      status = FlagStatus.PENDING,
      vendorId,
      assignedTo,
      page = 1,
      limit = 20,
    } = options || {};

    const where: Prisma.ContentFlagWhereInput = {};

    if (contentType) where.contentType = contentType;
    if (reason) where.reason = reason;
    if (priority) where.priority = priority;
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (assignedTo) where.assignedTo = assignedTo;

    const [flags, total] = await Promise.all([
      this.prisma.contentFlag.findMany({
        where,
        include: {
          Vendor: { select: { id: true, storeName: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { reportCount: 'desc' },
          { createdAt: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contentFlag.count({ where }),
    ]);

    return {
      flags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const stats = await this.prisma.contentFlag.groupBy({
      by: ['status', 'priority', 'contentType'],
      _count: { id: true },
      where: {
        status: { in: [FlagStatus.PENDING, FlagStatus.UNDER_REVIEW] },
      },
    });

    const pending = await this.prisma.contentFlag.count({
      where: { status: FlagStatus.PENDING },
    });

    const underReview = await this.prisma.contentFlag.count({
      where: { status: FlagStatus.UNDER_REVIEW },
    });

    const highPriority = await this.prisma.contentFlag.count({
      where: {
        priority: { in: [FlagPriority.HIGH, FlagPriority.CRITICAL] },
        status: { in: [FlagStatus.PENDING, FlagStatus.UNDER_REVIEW] },
      },
    });

    const resolvedToday = await this.prisma.contentFlag.count({
      where: {
        status: FlagStatus.RESOLVED,
        moderatedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    return {
      pending,
      underReview,
      highPriority,
      resolvedToday,
      breakdown: stats,
    };
  }

  /**
   * Get moderator performance
   */
  async getModeratorPerformance(adminId: string, startDate: Date, endDate: Date) {
    const resolved = await this.prisma.contentFlag.findMany({
      where: {
        moderatedBy: adminId,
        moderatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        action: true,
        createdAt: true,
        moderatedAt: true,
      },
    });

    const stats = {
      total: resolved.length,
      byAction: {} as Record<string, number>,
      avgResolutionTime: 0,
    };

    let totalTime = 0;
    for (const flag of resolved) {
      if (flag.action) {
        stats.byAction[flag.action] = (stats.byAction[flag.action] || 0) + 1;
      }
      if (flag.moderatedAt) {
        totalTime += flag.moderatedAt.getTime() - flag.createdAt.getTime();
      }
    }

    if (resolved.length > 0) {
      stats.avgResolutionTime = Math.round(totalTime / resolved.length / 1000 / 60); // in minutes
    }

    return stats;
  }

  /**
   * Auto-flag content based on keywords
   */
  async autoFlagContent(
    contentType: ContentFlagType,
    contentId: string,
    text: string,
  ): Promise<boolean> {
    const lowerText = text.toLowerCase();

    for (const keyword of AUTO_FLAG_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        await this.createFlag({
          contentType,
          contentId,
          reason: FlagReason.PROHIBITED,
          description: `Auto-flagged: Contains keyword "${keyword}"`,
          isAutoFlagged: true,
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Bulk moderate flags
   */
  async bulkModerate(
    flagIds: string[],
    action: ModerationAction,
    notes: string,
    adminId: string,
    adminEmail?: string,
  ) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { flagId: string; error: string }[],
    };

    for (const flagId of flagIds) {
      try {
        await this.moderateFlag(flagId, {
          action,
          notes,
          moderatedBy: adminId,
          moderatedByEmail: adminEmail,
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          flagId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get content details for review
   */
  async getContentForReview(contentType: ContentFlagType, contentId: string) {
    switch (contentType) {
      case ContentFlagType.PRODUCT:
        return this.prisma.product.findUnique({
          where: { id: contentId },
          include: {
            Vendor: { select: { id: true, storeName: true } },
            Category: { select: { id: true, name: true } },
          },
        });

      case ContentFlagType.REVIEW:
        return this.prisma.review.findUnique({
          where: { id: contentId },
          include: {
            User: { select: { id: true, name: true } },
            Product: { select: { id: true, title: true } },
          },
        });

      case ContentFlagType.VENDOR_PROFILE:
        return this.prisma.vendor.findUnique({
          where: { id: contentId },
        });

      case ContentFlagType.PRODUCT_IMAGE:
        return this.prisma.product.findUnique({
          where: { id: contentId },
          select: { id: true, title: true, images: true },
        });

      case ContentFlagType.BANNER:
        return this.prisma.bannerCampaign.findUnique({
          where: { id: contentId },
        });

      default:
        return null;
    }
  }

  // Private helper methods

  private async verifyContentExists(
    contentType: ContentFlagType,
    contentId: string,
  ): Promise<boolean> {
    let content;

    switch (contentType) {
      case ContentFlagType.PRODUCT:
      case ContentFlagType.PRODUCT_IMAGE:
        content = await this.prisma.product.findUnique({ where: { id: contentId } });
        break;
      case ContentFlagType.REVIEW:
        content = await this.prisma.review.findUnique({ where: { id: contentId } });
        break;
      case ContentFlagType.VENDOR_PROFILE:
        content = await this.prisma.vendor.findUnique({ where: { id: contentId } });
        break;
      case ContentFlagType.BANNER:
        content = await this.prisma.bannerCampaign.findUnique({ where: { id: contentId } });
        break;
      default:
        return false;
    }

    return !!content;
  }

  private async getVendorIdForContent(
    contentType: ContentFlagType,
    contentId: string,
  ): Promise<string | null> {
    switch (contentType) {
      case ContentFlagType.PRODUCT:
      case ContentFlagType.PRODUCT_IMAGE:
        const product = await this.prisma.product.findUnique({
          where: { id: contentId },
          select: { vendorId: true },
        });
        return product?.vendorId || null;

      case ContentFlagType.VENDOR_PROFILE:
        return contentId;

      case ContentFlagType.BANNER:
        const banner = await this.prisma.bannerCampaign.findUnique({
          where: { id: contentId },
          select: { vendorId: true },
        });
        return banner?.vendorId || null;

      default:
        return null;
    }
  }

  private calculatePriority(reason: FlagReason, isAutoFlagged?: boolean): FlagPriority {
    const score = PRIORITY_SCORES[reason];

    // Auto-flagged content gets higher priority
    const adjustedScore = isAutoFlagged ? score + 1 : score;

    if (adjustedScore >= 5) return FlagPriority.CRITICAL;
    if (adjustedScore >= 4) return FlagPriority.HIGH;
    if (adjustedScore >= 2) return FlagPriority.MEDIUM;
    return FlagPriority.LOW;
  }

  private async executeAction(flag: any, action: ModerationAction) {
    switch (action) {
      case ModerationAction.APPROVE:
        // No action needed, content stays
        break;

      case ModerationAction.REMOVE:
        await this.removeContent(flag.contentType, flag.contentId);
        break;

      case ModerationAction.HIDE:
        await this.hideContent(flag.contentType, flag.contentId);
        break;

      case ModerationAction.EDIT:
        // Manual edit required, flag content for editing
        break;

      case ModerationAction.WARN:
        // Warning notification sent (handled separately)
        break;
    }
  }

  private async removeContent(contentType: ContentFlagType, contentId: string) {
    switch (contentType) {
      case ContentFlagType.PRODUCT:
      case ContentFlagType.PRODUCT_IMAGE:
        await this.prisma.product.update({
          where: { id: contentId },
          data: { isActive: false },
        });
        break;

      case ContentFlagType.REVIEW:
        await this.prisma.review.delete({
          where: { id: contentId },
        });
        break;

      case ContentFlagType.BANNER:
        await this.prisma.bannerCampaign.update({
          where: { id: contentId },
          data: { status: 'REJECTED' },
        });
        break;
    }
  }

  private async hideContent(contentType: ContentFlagType, contentId: string) {
    switch (contentType) {
      case ContentFlagType.PRODUCT:
        await this.prisma.product.update({
          where: { id: contentId },
          data: { isActive: false },
        });
        break;

      case ContentFlagType.VENDOR_PROFILE:
        await this.prisma.vendor.update({
          where: { id: contentId },
          data: { isActive: false },
        });
        break;
    }
  }

  private getAuditActionForModerationAction(action: ModerationAction): AuditActionType {
    switch (action) {
      case ModerationAction.APPROVE:
        return AuditActionType.CONTENT_APPROVED;
      case ModerationAction.REMOVE:
      case ModerationAction.HIDE:
        return AuditActionType.CONTENT_REMOVED;
      default:
        return AuditActionType.CONTENT_APPROVED;
    }
  }
}


