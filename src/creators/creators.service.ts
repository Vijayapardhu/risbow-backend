import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(private prisma: PrismaService) {}

  async becomeCreator(userId: string, displayName: string, bio?: string, profileImageUrl?: string) {
    // Check if creator profile already exists
    const existing = await this.prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('User is already a creator.');
    }

    // Create creator profile
    const creatorProfile = await this.prisma.creatorProfile.create({
      data: {
        id: randomUUID(),
        userId,
        displayName,
        bio,
        profileImageUrl,
        isVerified: false,
        updatedAt: new Date(),
      },
    });

    return creatorProfile;
  }

  async updateCreatorProfile(
    userId: string,
    displayName?: string,
    bio?: string,
    profileImageUrl?: string,
  ) {
    const creatorProfile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creatorProfile) {
      throw new NotFoundException('Creator profile not found.');
    }

    if (creatorProfile.userId !== userId) {
      throw new BadRequestException('Unauthorized to update this profile.');
    }

    const updated = await this.prisma.creatorProfile.update({
      where: { userId },
      data: {
        ...(displayName && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(profileImageUrl && { profileImageUrl }),
      },
    });

    return updated;
  }

  async getCreatorProfile(creatorId: string) {
    const creatorProfile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!creatorProfile) {
      throw new NotFoundException('Creator profile not found.');
    }

    // Get reel count (from ledger, not counter)
    const reelCount = await this.prisma.reel.count({
      where: { creatorId },
    });

    return {
      ...creatorProfile,
      reelCount,
    };
  }

  async getCreatorReels(creatorId: string, limit = 20, offset = 0) {
    const creatorProfile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorId },
    });

    if (!creatorProfile) {
      throw new NotFoundException('Creator profile not found.');
    }

    return this.prisma.reel.findMany({
      where: {
        creatorId,
        flaggedForReview: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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
