import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class ReelsService {
  private readonly logger = new Logger(ReelsService.name);
  private readonly REELS_PER_DAY_LIMIT = 10;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createReel(
    userId: string,
    file: Express.Multer.File,
    vendorId?: string,
    creatorId?: string,
    productId?: string,
    description?: string,
  ) {
    // Validate: Must be either vendor or creator, not both
    if (!vendorId && !creatorId) {
      throw new BadRequestException('Either vendorId or creatorId must be provided.');
    }

    if (vendorId && creatorId) {
      throw new BadRequestException('Cannot specify both vendorId and creatorId.');
    }

    // If creatorId, verify user is the creator
    if (creatorId) {
      const creatorProfile = await this.prisma.creatorProfile.findUnique({
        where: { id: creatorId },
        select: { userId: true },
      });

      if (!creatorProfile || creatorProfile.userId !== userId) {
        throw new BadRequestException('Unauthorized. You are not the creator of this profile.');
      }
    }

    // If vendorId, verify user is the vendor
    if (vendorId && vendorId !== userId) {
      throw new BadRequestException('Unauthorized. You are not the vendor.');
    }

    // Rate limiting: Check reels count for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayReelsCount = await this.prisma.reel.count({
      where: {
        OR: [
          vendorId ? { vendorId } : { creatorId },
        ],
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (todayReelsCount >= this.REELS_PER_DAY_LIMIT) {
      throw new BadRequestException(
        `Rate limit exceeded. Maximum ${this.REELS_PER_DAY_LIMIT} reels per day allowed.`
      );
    }

    // Upload to Supabase Storage via Edge Function
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/reels-upload`;
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new BadRequestException('Supabase configuration missing');
    }

    const formData = new FormData();
    formData.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    if (vendorId) formData.append('vendorId', vendorId);
    if (creatorId) formData.append('creatorId', creatorId);
    if (productId) formData.append('productId', productId);
    if (description) formData.append('description', description);

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errBody: any = await response.json().catch(() => ({}));
      const msg = errBody?.error || errBody?.message || 'Failed to upload reel';
      this.logger.error(`Reel upload failed: ${msg}`);
      throw new BadRequestException(msg);
    }

    const result: any = await response.json().catch(() => ({}));
    return result?.reel;
  }

  async getReels(vendorId?: string, creatorId?: string, productId?: string, limit = 20, offset = 0) {
    const where: any = {
      flaggedForReview: false,
    };

    if (vendorId) where.vendorId = vendorId;
    if (creatorId) where.creatorId = creatorId;
    if (productId) where.productId = productId;

    return this.prisma.reel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
            storeName: true,
            storeLogo: true,
          },
        },
        CreatorProfile: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
          },
        },
        Product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
      },
    });
  }

  async likeReel(reelId: string, userId: string) {
    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    // Check if already liked
    const existingLike = await this.prisma.reelInteractionLedger.findUnique({
      where: {
        reelId_userId_interactionType: {
          reelId,
          userId,
          interactionType: 'LIKE',
        },
      },
    });

    if (existingLike) {
      // Unlike: Remove ledger entry
      await this.prisma.reelInteractionLedger.delete({
        where: { id: existingLike.id },
      });

      return { liked: false, message: 'Reel unliked successfully.' };
    } else {
      // Like: Create ledger entry
      await this.prisma.reelInteractionLedger.create({
        data: {
          id: randomUUID(),
          User: { connect: { id: userId } },
          Reel: { connect: { id: reelId } },
          interactionType: 'LIKE',
        },
      });

      return { liked: true, message: 'Reel liked successfully.' };
    }
  }

  async viewReel(reelId: string, userId?: string) {
    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    // If user is authenticated, check for existing view in last 24h
    if (userId) {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const existingView = await this.prisma.reelInteractionLedger.findFirst({
        where: {
          reelId,
          userId,
          interactionType: 'VIEW',
          createdAt: { gte: twentyFourHoursAgo },
        },
      });

      if (existingView) {
        return { viewed: true, message: 'View already recorded in last 24 hours.' };
      }

      // Create view ledger entry
      await this.prisma.reelInteractionLedger.create({
        data: {
          id: randomUUID(),
          User: { connect: { id: userId } },
          Reel: { connect: { id: reelId } },
          interactionType: 'VIEW',
        },
      });
    }

    return { viewed: true, message: 'View recorded successfully.' };
  }

  async getReelStats(reelId: string) {
    const [likes, views] = await Promise.all([
      this.prisma.reelInteractionLedger.count({
        where: { reelId, interactionType: 'LIKE' },
      }),
      this.prisma.reelInteractionLedger.count({
        where: { reelId, interactionType: 'VIEW' },
      }),
    ]);

    return { likes, views };
  }

  async getProductReels(productId: string) {
    return this.prisma.reel.findMany({
      where: {
        productId,
        flaggedForReview: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
            storeName: true,
            storeLogo: true,
          },
        },
        CreatorProfile: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  async getCreatorReels(creatorId: string) {
    const creatorProfile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      select: { id: true },
    });

    if (!creatorProfile) {
      throw new NotFoundException('Creator profile not found');
    }

    return this.prisma.reel.findMany({
      where: {
        creatorId,
        flaggedForReview: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        Product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
      },
    });
  }
}
