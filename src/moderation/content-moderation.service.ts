import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);

  constructor(private prisma: PrismaService) {}

  async flagContent(
    contentType: 'STORY' | 'REEL',
    contentId: string,
    reason: string,
    flaggedBy?: string,
  ) {
    // Verify content exists
    if (contentType === 'STORY') {
      const story = await this.prisma.story.findUnique({
        where: { id: contentId },
      });
      if (!story) {
        throw new NotFoundException('Story not found');
      }

      // Update story flaggedForReview
      await this.prisma.story.update({
        where: { id: contentId },
        data: { flaggedForReview: true },
      });
    } else if (contentType === 'REEL') {
      const reel = await this.prisma.reel.findUnique({
        where: { id: contentId },
      });
      if (!reel) {
        throw new NotFoundException('Reel not found');
      }

      // Update reel flaggedForReview
      await this.prisma.reel.update({
        where: { id: contentId },
        data: { flaggedForReview: true },
      });
    }

    // Create ContentModeration record
    const moderation = await this.prisma.contentModeration.create({
      data: {
        contentType,
        contentId,
        flaggedBy: flaggedBy || null,
        reason,
        status: 'PENDING',
      },
    });

    return moderation;
  }

  async reviewContent(
    moderationId: string,
    adminId: string,
    decision: 'APPROVED' | 'REJECTED',
  ) {
    const moderation = await this.prisma.contentModeration.findUnique({
      where: { id: moderationId },
    });

    if (!moderation) {
      throw new NotFoundException('Moderation record not found');
    }

    if (moderation.status !== 'PENDING') {
      throw new BadRequestException('Moderation record has already been reviewed');
    }

    // Update moderation status
    const updated = await this.prisma.contentModeration.update({
      where: { id: moderationId },
      data: {
        status: decision,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // If REJECTED, hide content
    if (decision === 'REJECTED') {
      if (moderation.contentType === 'STORY') {
        await this.prisma.story.update({
          where: { id: moderation.contentId },
          data: { isActive: false, flaggedForReview: true },
        });
      } else if (moderation.contentType === 'REEL') {
        // Reels are hidden by flaggedForReview flag (already set)
        // Optionally set isActive if we add that field
      }
    } else if (decision === 'APPROVED') {
      // If APPROVED, remove flag
      if (moderation.contentType === 'STORY') {
        await this.prisma.story.update({
          where: { id: moderation.contentId },
          data: { flaggedForReview: false },
        });
      } else if (moderation.contentType === 'REEL') {
        await this.prisma.reel.update({
          where: { id: moderation.contentId },
          data: { flaggedForReview: false },
        });
      }
    }

    return updated;
  }

  async getPendingModerations(limit = 50, offset = 0) {
    return this.prisma.contentModeration.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        // Note: We can't include Story/Reel directly, but we can fetch them separately if needed
      },
    });
  }

  async getModerationHistory(contentType?: 'STORY' | 'REEL', contentId?: string) {
    const where: any = {};
    if (contentType) where.contentType = contentType;
    if (contentId) where.contentId = contentId;

    return this.prisma.contentModeration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
