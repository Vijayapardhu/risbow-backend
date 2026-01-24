import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type BeginArgs = {
  key: string;
  scope: string;
  method: string;
  path: string;
  requestHash: string;
  ttlSeconds: number;
};

@Injectable()
export class IdempotencyService {
  constructor(private prisma: PrismaService) {}

  async begin(args: BeginArgs): Promise<{
    action: 'PROCEED' | 'REPLAY';
    recordId?: string;
    response?: any;
    statusCode?: number;
  }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + args.ttlSeconds * 1000);

    // Try to insert a new record; if it already exists, decide based on stored state.
    try {
      const created = await (this.prisma as any).idempotencyRecord.create({
        data: {
          key: args.key,
          scope: args.scope,
          method: args.method,
          path: args.path,
          requestHash: args.requestHash,
          status: 'IN_PROGRESS',
          expiresAt,
        },
        select: { id: true },
      });

      return { action: 'PROCEED', recordId: created.id };
    } catch (e: any) {
      // Unique violation -> read existing
      const existing = await (this.prisma as any).idempotencyRecord.findFirst({
        where: {
          key: args.key,
          scope: args.scope,
          method: args.method,
          path: args.path,
        },
      });

      if (!existing) {
        // Race where create failed but row not visible yet; safest is conflict.
        throw new ConflictException('Idempotency key is being processed. Please retry.');
      }

      if (existing.requestHash !== args.requestHash) {
        throw new ConflictException('Idempotency key reuse with different request payload is not allowed.');
      }

      if (existing.status === 'COMPLETED') {
        return { action: 'REPLAY', response: existing.response, statusCode: existing.statusCode || 200 };
      }

      if (existing.status === 'IN_PROGRESS') {
        throw new ConflictException('Request is already in progress for this idempotency key.');
      }

      // FAILED: require a new idempotency key to retry safely.
      throw new ConflictException('Previous attempt failed for this idempotency key. Use a new idempotency key to retry.');
    }
  }

  async complete(recordId: string, statusCode: number, response: any) {
    await (this.prisma as any).idempotencyRecord.update({
      where: { id: recordId },
      data: {
        status: 'COMPLETED',
        statusCode,
        response,
      },
    });
  }

  async fail(recordId: string) {
    await (this.prisma as any).idempotencyRecord.update({
      where: { id: recordId },
      data: { status: 'FAILED' },
    }).catch(() => undefined);
  }
}

