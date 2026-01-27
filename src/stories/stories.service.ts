import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../shared/supabase.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);
  private readonly STORIES_PER_DAY_LIMIT = 5;

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  async createStory(vendorId: string, file: Express.Multer.File, mediaType: string) {
    // Rate limiting: Check max active stories (PRD requirement: max 5 active stories per vendor)
    const maxActiveStories = 5;
    const activeStoriesCount = await this.prisma.story.count({
      where: {
        vendorId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeStoriesCount >= maxActiveStories) {
      throw new BadRequestException(
        `Maximum ${maxActiveStories} active stories allowed. Please delete an existing story or wait for it to expire.`
      );
    }

    // Also check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayStoriesCount = await this.prisma.story.count({
      where: {
        vendorId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (todayStoriesCount >= this.STORIES_PER_DAY_LIMIT) {
      throw new BadRequestException(
        `Rate limit exceeded. Maximum ${this.STORIES_PER_DAY_LIMIT} stories per day allowed.`
      );
    }

    // Upload to Supabase Storage via Edge Function
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/stories-upload`;
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new BadRequestException('Supabase configuration missing');
    }

    const formData = new FormData();
    formData.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    formData.append('mediaType', mediaType);

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      this.logger.error(`Story upload failed: ${error.error}`);
      throw new BadRequestException(error.error || 'Failed to upload story');
    }

    const result = await response.json();
    return result.story;
  }

  async getActiveStories(vendorId?: string) {
    const where: any = {
      isActive: true,
      expiresAt: { gt: new Date() },
      flaggedForReview: false,
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    return this.prisma.story.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            storeName: true,
            storeLogo: true,
          },
        },
      },
    });
  }

  async getVendorStories(vendorId: string) {
    return this.prisma.story.findMany({
      where: {
        vendorId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteStory(storyId: string, vendorId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new BadRequestException('Story not found');
    }

    if (story.vendorId !== vendorId) {
      throw new BadRequestException('Unauthorized to delete this story');
    }

    await this.prisma.story.delete({
      where: { id: storyId },
    });

    return { success: true, message: 'Story deleted successfully' };
  }

  async deleteExpiredStories() {
    const now = new Date();
    const deleted = await this.prisma.story.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { isActive: false },
        ],
      },
    });

    this.logger.log(`Deleted ${deleted.count} expired stories`);
    return { deleted: deleted.count };
  }
}
