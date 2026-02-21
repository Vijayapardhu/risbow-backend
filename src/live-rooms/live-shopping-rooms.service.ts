import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { LiveRoomStatus, LiveRoomType, RoomCreatorType, MessageType } from '@prisma/client';

export interface CreateRoomDto {
  name: string;
  description?: string;
  productId: string;
  variantId?: string;
  basePrice: number;
  costPrice: number;
  minDiscount?: number;
  maxDiscount?: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  maxParticipants?: number;
  minParticipants?: number;
  discountTiers: {
    minParticipants: number;
    maxParticipants?: number;
    discountPercent: number;
  }[];
}

export interface RoomWithPricing {
  id: string;
  name: string;
  description?: string;
  status: LiveRoomStatus;
  basePrice: number;
  costPrice: number;
  currentDiscount: number;
  currentPrice: number;
  participantCount: number;
  maxParticipants: number;
  discountTiers: {
    minParticipants: number;
    maxParticipants?: number;
    discountPercent: number;
    isActive: boolean;
  }[];
  product: any;
  vendor?: any;
}

@Injectable()
export class LiveShoppingRoomsService {
  private readonly logger = new Logger(LiveShoppingRoomsService.name);

  // Default discount tiers if not specified
  private readonly defaultTiers = [
    { minParticipants: 1, maxParticipants: 5, discountPercent: 5 },
    { minParticipants: 6, maxParticipants: 10, discountPercent: 10 },
    { minParticipants: 11, maxParticipants: 20, discountPercent: 15 },
    { minParticipants: 21, maxParticipants: null, discountPercent: 20 },
  ];

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) { }

  /**
   * Calculate current discount based on participant count
   */
  calculateDiscount(participantCount: number, tiers: { minParticipants: number; maxParticipants?: number; discountPercent: number }[]): number {
    // Sort tiers by minParticipants ascending
    const sortedTiers = [...tiers].sort((a, b) => a.minParticipants - b.minParticipants);

    for (const tier of sortedTiers) {
      const maxParticipants = tier.maxParticipants ?? Infinity;
      if (participantCount >= tier.minParticipants && participantCount <= maxParticipants) {
        return tier.discountPercent;
      }
    }

    // If no tier matches, return the first tier's discount or 0
    return sortedTiers[0]?.discountPercent ?? 0;
  }

  /**
   * Calculate current price after discount
   */
  calculatePrice(basePrice: number, discountPercent: number): number {
    return Math.round(basePrice * (1 - discountPercent / 100));
  }

  /**
   * Create a new live shopping room (Vendor)
   */
  async createVendorRoom(vendorId: string, dto: CreateRoomDto): Promise<any> {
    // Validate product belongs to vendor
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, vendorId },
    });

    if (!product) {
      throw new ForbiddenException('Product not found or does not belong to vendor');
    }

    // Use provided tiers or defaults
    const tiers = dto.discountTiers?.length > 0 ? dto.discountTiers : this.defaultTiers;

    // Validate tiers don't exceed max discount
    const maxTierDiscount = Math.max(...tiers.map(t => t.discountPercent));
    const maxDiscount = dto.maxDiscount ?? 20;

    if (maxTierDiscount > maxDiscount) {
      throw new BadRequestException(`Discount tier ${maxTierDiscount}% exceeds maximum allowed ${maxDiscount}%`);
    }

    const room = await this.prisma.liveShoppingRoom.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: LiveRoomType.VENDOR_MANAGED,
        status: LiveRoomStatus.SCHEDULED,
        productId: dto.productId,
        variantId: dto.variantId,
        basePrice: dto.basePrice,
        costPrice: dto.costPrice,
        minDiscount: dto.minDiscount ?? 0,
        maxDiscount: maxDiscount,
        currentDiscount: 0,
        scheduledStart: dto.scheduledStart,
        scheduledEnd: dto.scheduledEnd,
        maxParticipants: dto.maxParticipants ?? 100,
        minParticipants: dto.minParticipants ?? 1,
        createdById: vendorId,
        createdByType: RoomCreatorType.VENDOR,
        vendorId,
        discountTiers: {
          create: tiers.map(tier => ({
            minParticipants: tier.minParticipants,
            maxParticipants: tier.maxParticipants,
            discountPercent: tier.discountPercent,
          })),
        },
      },
      include: {
        discountTiers: true,
        Product: true,
        Vendor: true,
      },
    });

    this.logger.log(`Created vendor room ${room.id} for product ${dto.productId}`);
    return room;
  }

  /**
   * Create a new live shopping room (Admin)
   */
  async createAdminRoom(adminId: string, dto: CreateRoomDto): Promise<any> {
    // Admin can create rooms for any product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const tiers = dto.discountTiers?.length > 0 ? dto.discountTiers : this.defaultTiers;

    const room = await this.prisma.liveShoppingRoom.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: LiveRoomType.ADMIN_MANAGED,
        status: LiveRoomStatus.SCHEDULED,
        productId: dto.productId,
        variantId: dto.variantId,
        basePrice: dto.basePrice,
        costPrice: dto.costPrice,
        minDiscount: dto.minDiscount ?? 0,
        maxDiscount: dto.maxDiscount ?? 20,
        currentDiscount: 0,
        scheduledStart: dto.scheduledStart,
        scheduledEnd: dto.scheduledEnd,
        maxParticipants: dto.maxParticipants ?? 100,
        minParticipants: dto.minParticipants ?? 1,
        createdById: adminId,
        createdByType: RoomCreatorType.ADMIN,
        vendorId: product.vendorId,
        discountTiers: {
          create: tiers.map(tier => ({
            minParticipants: tier.minParticipants,
            maxParticipants: tier.maxParticipants,
            discountPercent: tier.discountPercent,
          })),
        },
      },
      include: {
        discountTiers: true,
        Product: true,
        Vendor: true,
      },
    });

    this.logger.log(`Created admin room ${room.id} for product ${dto.productId}`);
    return room;
  }

  /**
   * Get room with current pricing
   */
  async getRoomWithPricing(roomId: string): Promise<RoomWithPricing> {
    const cacheKey = `room:pricing:${roomId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const room = await this.prisma.liveShoppingRoom.findUnique({
      where: { id: roomId },
      include: {
        discountTiers: true,
        Product: true,
        Vendor: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const currentDiscount = this.calculateDiscount(
      room.participantCount,
      room.discountTiers
    );

    const currentPrice = this.calculatePrice(room.basePrice, currentDiscount);

    const pricing: RoomWithPricing = {
      id: room.id,
      name: room.name,
      description: room.description,
      status: room.status,
      basePrice: room.basePrice,
      costPrice: room.costPrice,
      currentDiscount,
      currentPrice,
      participantCount: room.participantCount,
      maxParticipants: room.maxParticipants,
      discountTiers: room.discountTiers.map(tier => ({
        minParticipants: tier.minParticipants,
        maxParticipants: tier.maxParticipants ?? undefined,
        discountPercent: tier.discountPercent,
        isActive: room.participantCount >= tier.minParticipants &&
          (tier.maxParticipants === null || room.participantCount <= tier.maxParticipants),
      })),
      product: room.Product,
      vendor: room.Vendor,
    };

    // Cache for 30 seconds
    await this.redis.set(cacheKey, JSON.stringify(pricing), 30);

    return pricing;
  }

  /**
   * Join a room
   */
  async joinRoom(roomId: string, userId: string): Promise<any> {
    const room = await this.prisma.liveShoppingRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status !== LiveRoomStatus.LIVE && room.status !== LiveRoomStatus.SCHEDULED) {
      throw new BadRequestException('Room is not active');
    }

    if (room.participantCount >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    // Check if user already joined
    const existingParticipant = await this.prisma.liveRoomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (existingParticipant?.isActive) {
      return existingParticipant;
    }

    // Create or reactivate participant
    const participant = await this.prisma.liveRoomParticipant.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      update: {
        isActive: true,
        leftAt: null,
      },
      create: {
        roomId,
        userId,
        isActive: true,
      },
    });

    // Update participant count
    await this.prisma.liveShoppingRoom.update({
      where: { id: roomId },
      data: {
        participantCount: {
          increment: 1,
        },
      },
    });

    // Invalidate pricing cache
    await this.redis.del(`room:pricing:${roomId}`);

    // Add system message
    await this.addSystemMessage(roomId, `${userId} joined the room`, MessageType.USER_JOIN);

    this.logger.log(`User ${userId} joined room ${roomId}`);
    return participant;
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await this.prisma.liveRoomParticipant.updateMany({
      where: {
        roomId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    // Update participant count
    await this.prisma.liveShoppingRoom.update({
      where: { id: roomId },
      data: {
        participantCount: {
          decrement: 1,
        },
      },
    });

    // Invalidate pricing cache
    await this.redis.del(`room:pricing:${roomId}`);

    this.logger.log(`User ${userId} left room ${roomId}`);
  }

  /**
   * Add a message to the room
   */
  async addMessage(roomId: string, userId: string, content: string, type: MessageType = MessageType.TEXT): Promise<any> {
    const room = await this.prisma.liveShoppingRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const message = await this.prisma.liveRoomMessage.create({
      data: {
        roomId,
        userId,
        content,
        type,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return message;
  }

  /**
   * Add a system message
   */
  async addSystemMessage(roomId: string, content: string, type: MessageType): Promise<any> {
    return this.addMessage(roomId, 'system', content, type);
  }

  /**
   * Get room messages
   */
  async getMessages(roomId: string, limit: number = 50, before?: Date): Promise<any[]> {
    return this.prisma.liveRoomMessage.findMany({
      where: {
        roomId,
        ...(before && { createdAt: { lt: before } }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        User: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get active participants
   */
  async getActiveParticipants(roomId: string): Promise<any[]> {
    return this.prisma.liveRoomParticipant.findMany({
      where: {
        roomId,
        isActive: true,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Record a purchase from the room
   */
  async recordPurchase(roomId: string, userId: string, orderId: string, discountApplied: number): Promise<any> {
    const room = await this.getRoomWithPricing(roomId);

    const finalPrice = this.calculatePrice(room.basePrice, discountApplied);

    const purchase = await this.prisma.liveRoomOrder.create({
      data: {
        roomId,
        orderId,
        userId,
        discountApplied,
        finalPrice,
      },
    });

    // Update room stats
    await this.prisma.liveShoppingRoom.update({
      where: { id: roomId },
      data: {
        orderCount: {
          increment: 1,
        },
        totalRevenue: {
          increment: finalPrice,
        },
      },
    });

    // Add system message
    await this.addSystemMessage(
      roomId,
      `New purchase! Discount: ${discountApplied}%`,
      MessageType.PURCHASE
    );

    this.logger.log(`Purchase recorded in room ${roomId}: Order ${orderId}`);
    return purchase;
  }

  /**
   * Get rooms for vendor
   */
  async getVendorRooms(vendorId: string, status?: LiveRoomStatus): Promise<any[]> {
    return this.prisma.liveShoppingRoom.findMany({
      where: {
        vendorId,
        ...(status && { status }),
      },
      include: {
        Product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
        discountTiers: true,
        _count: {
          select: {
            Participants: true,
            Orders: true,
          },
        },
      },
      orderBy: {
        scheduledStart: 'desc',
      },
    });
  }

  /**
   * Get all active/scheduled rooms for discovery
   */
  async getActiveRooms(): Promise<any[]> {
    const now = new Date();

    return this.prisma.liveShoppingRoom.findMany({
      where: {
        status: {
          in: [LiveRoomStatus.SCHEDULED, LiveRoomStatus.LIVE],
        },
        scheduledEnd: {
          gt: now,
        },
      },
      include: {
        Product: {
          select: {
            id: true,
            title: true,
            images: true,
            Vendor: {
              select: {
                id: true,
                name: true,
                storeLogo: true,
              },
            },
          },
        },
        discountTiers: true,
      },
      orderBy: [
        { status: 'asc' },
        { scheduledStart: 'asc' },
      ],
    });
  }

  /**
   * Start a room (change status to LIVE)
   */
  async startRoom(roomId: string, creatorId: string): Promise<any> {
    const room = await this.prisma.liveShoppingRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Verify creator
    if (room.createdById !== creatorId) {
      throw new ForbiddenException('Only the creator can start the room');
    }

    const updated = await this.prisma.liveShoppingRoom.update({
      where: { id: roomId },
      data: {
        status: LiveRoomStatus.LIVE,
        actualStart: new Date(),
      },
    });

    await this.addSystemMessage(roomId, 'Room is now LIVE!', MessageType.SYSTEM);

    return updated;
  }

  /**
   * End a room
   */
  async endRoom(roomId: string, creatorId: string): Promise<any> {
    const room = await this.prisma.liveShoppingRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.createdById !== creatorId) {
      throw new ForbiddenException('Only the creator can end the room');
    }

    const updated = await this.prisma.liveShoppingRoom.update({
      where: { id: roomId },
      data: {
        status: LiveRoomStatus.ENDED,
        actualEnd: new Date(),
      },
    });

    await this.addSystemMessage(roomId, 'Room has ended', MessageType.SYSTEM);

    return updated;
  }
}
