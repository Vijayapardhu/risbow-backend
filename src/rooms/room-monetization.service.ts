import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomBoostType, AuditLog } from '@prisma/client';
import { AuditLogService } from '../audit/audit.service';
import { RedisService } from '../shared/redis.service';
import { randomUUID } from 'crypto';

@Injectable()
export class RoomMonetizationService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditLogService,
    private redis: RedisService,
  ) { }

  /**
   * Task 2: Purchase a room boost atomically.
   * Checks for balance, prevents overlapping boosts of same type, and logs the transaction.
   */
  async purchaseRoomBoost(
    actorId: string,
    dto: {
      roomId: string;
      type: RoomBoostType;
      coinsCost: number;
      durationMinutes: number;
      vendorId?: string; // If null, assume admin/system purchase
    }
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Verify Room
      const room = await tx.room.findUnique({ where: { id: dto.roomId } });
      if (!room) throw new NotFoundException('Room not found');
      if (room.status === 'EXPIRED') throw new BadRequestException('Cannot boost an expired room');

      // 2. Conflict Check: No overlapping boosts of same type
      const now = new Date();
      const startAt = now;
      const endAt = new Date(now.getTime() + dto.durationMinutes * 60000);

      const existingBoost = await tx.roomBoost.findFirst({
        where: {
          roomId: dto.roomId,
          type: dto.type,
          isActive: true,
          endAt: { gt: now }
        }
      });
      if (existingBoost) {
        throw new BadRequestException(`A boost of type ${dto.type} is already active for this room until ${existingBoost.endAt.toISOString()}`);
      }

      // 3. Atomic Coin Deduction (if vendorId provided)
      if (dto.vendorId) {
        const vendorUpdate = await tx.vendor.updateMany({
          where: {
            id: dto.vendorId,
            coinsBalance: { gte: dto.coinsCost }
          },
          data: {
            coinsBalance: { decrement: dto.coinsCost }
          }
        });

        if (vendorUpdate.count === 0) {
          throw new BadRequestException('Insufficient coin balance for this boost');
        }

        // Log Coin Movement
        await tx.coinLedger.create({
          data: {
            id: randomUUID(),
            userId: actorId, // In vendor context, userId corresponds to the actor
            amount: -dto.coinsCost,
            source: `ROOM_BOOST_${dto.type}`,
            referenceId: dto.roomId,
          }
        });
      }

      // 4. Create Room Boost
      const boost = await tx.roomBoost.create({
        data: {
          id: randomUUID(),
          roomId: dto.roomId,
          vendorId: dto.vendorId,
          type: dto.type,
          coinsCost: dto.coinsCost,
          startAt,
          endAt,
          isActive: true
        }
      });

      // 5. Audit Log
      await this.audit.logAdminAction(
        actorId,
        'PURCHASE_BOOST',
        'RoomBoost',
        boost.id,
        { roomId: dto.roomId, type: dto.type, cost: dto.coinsCost, duration: dto.durationMinutes }
      );

      // 6. Social Feedback Loop
      // Emit to gateway/redis if needed for real-time UI updates
      const activityMessage = `Room boosted with ${dto.type.replace('_', ' ')}! 🚀`;
      const activityKey = `room:feed:${dto.roomId}`;
      const activity = {
        id: Date.now().toString(),
        type: 'BOOST_APPLIED',
        message: activityMessage,
        timestamp: new Date().toISOString(),
        meta: { boostId: boost.id, type: dto.type }
      };
      await this.redis.lpush(activityKey, JSON.stringify(activity));
      await this.redis.ltrim(activityKey, 0, 99);

      return boost;
    });
  }
}