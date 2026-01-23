import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { RoomStatus, BowActionType, InteractionType, RoomBoost, RoomInsight } from '@prisma/client';

@Injectable()
export class BowRoomIntelligenceService {
  private readonly logger = new Logger(BowRoomIntelligenceService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) { }

  /**
   * Task 3.1: Calculate Room Unlock Probability (0.0 to 1.0)
   * Factors: Join rate, value vs threshold, time remaining, historical velocity.
   */
  async calculateUnlockProbability(roomId: string): Promise<number> {
    const cacheKey = `room:unlock:probability:${roomId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return parseFloat(cached);

    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { _count: { select: { members: true } } }
    });

    if (!room || room.status === 'EXPIRED') return 0;
    if (room.status === 'UNLOCKED') return 1;

    // Fetch aggregate stats
    const stats = await this.prisma.order.aggregate({
      where: { roomId, status: { in: ['CONFIRMED', 'DELIVERED', 'SHIPPED', 'PACKED', 'PAID'] } },
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    const currentValue = stats._sum.totalAmount || 0;
    const currentOrders = stats._count.id;

    // 🧠 Weighted Signal Engine
    // 1. Membership Factor (40%)
    const memberFactor = Math.min(room.memberCount / room.size, 1);

    // 2. Value Factor (30%)
    const valueFactor = Math.min(currentValue / room.unlockMinValue, 1);

    // 3. Time Factor (20%)
    const now = new Date();
    const totalDuration = room.endAt.getTime() - room.startAt.getTime();
    const elapsed = now.getTime() - room.startAt.getTime();
    const timeLeftFactor = Math.max(0, 1 - (elapsed / totalDuration));

    // 4. Velocity Signal (10%)
    // Orders per hour vs required
    const hoursElapsed = Math.max(elapsed / (1000 * 60 * 60), 0.1);
    const velocity = currentOrders / hoursElapsed;
    const requiredVelocity = room.unlockMinOrders / (totalDuration / (1000 * 60 * 60));
    const velocityFactor = Math.min(velocity / requiredVelocity, 1);

    const probability = (0.4 * memberFactor) + (0.3 * valueFactor) + (0.2 * timeLeftFactor) + (0.1 * velocityFactor);
    const finalProb = Number(probability.toFixed(2));

    await this.redis.set(cacheKey, finalProb.toString(), 60); // 1 min TTL

    // Persist to RoomInsight for analytics
    await this.prisma.roomInsight.create({
      data: {
        roomId,
        metric: 'UNLOCK_PROBABILITY',
        value: finalProb
      }
    });

    return finalProb;
  }

  /**
   * Task 3.2: Generate Intelligent Bow Nudge
   * Checks probability and urgency signals to trigger specific social/value nudges.
   */
  async generateRoomNudge(roomId: string, userId: string): Promise<any> {
    // Cooldown Check: Prevent repeated nudges (20 min cooldown)
    const cooldownKey = `bow:nudge:cooldown:${userId}:${roomId}`;
    const onCooldown = await this.redis.get(cooldownKey);
    if (onCooldown) return null;

    const prob = await this.calculateUnlockProbability(roomId);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return null;

    const now = new Date();
    const remainingMs = room.endAt.getTime() - now.getTime();
    const remainingMinutes = Math.floor(remainingMs / 60000);

    let nudge = null;

    // Urgency Nudge (High Priority)
    if (remainingMinutes < 30 && prob < 0.8) {
      nudge = {
        type: 'URGENCY',
        message: `Tick-tock! Only ${remainingMinutes} mins left to unlock these drop prices! ⏰`,
        action: 'VIEW_ROOM'
      };
    }
    // Social Proof Nudge
    else if (room.memberCount < room.size && prob < 0.6) {
      const missing = room.size - room.memberCount;
      nudge = {
        type: 'SOCIAL',
        message: `${room.memberCount} members already hunting! Need ${missing} more to unlock the deal. 🔥`,
        action: 'INVITE_FRIENDS'
      };
    }
    // Value Threshold Nudge
    else if (prob >= 0.6 && prob < 1.0) {
      nudge = {
        type: 'VALUE',
        message: `You're so close! Just a bit more group value to hit the target. 💰`,
        action: 'ADD_ITEMS'
      };
    }

    if (nudge) {
      // Record Interaction
      await this.prisma.bowInteraction.create({
        data: {
          userId,
          sessionId: `room_${roomId}`, // Structured session
          type: InteractionType.RECOMMENDATION,
          intent: 'ROOM_NUDGE',
          confidence: prob,
          actionType: BowActionType.ROOM_NUDGE,
          actionPayload: nudge,
          response: nudge.message
        }
      });

      // Set Cooldown
      await this.redis.set(cooldownKey, '1', 1200); // 20 mins

      // Post to Room Feed
      const feedKey = `room:feed:${roomId}`;
      await this.redis.lpush(feedKey, JSON.stringify({
        id: Date.now().toString(),
        type: 'BOW_NUDGE_SENT',
        message: `Bow nudged user ${userId.substring(0, 5)}... with ${nudge.type} strategy`,
        timestamp: new Date().toISOString()
      }));

      return nudge;
    }

    return null;
  }
}