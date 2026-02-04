import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { randomUUID } from 'crypto';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async creditWallet(userId: string, amount: number, idempotencyKey: string, source: string) {
    // Idempotency check
    const key = `wallet:idempotency:${idempotencyKey}`;
    const existing = await this.redis.get(key);
    if (existing) return { status: 'already_processed' };

    await this.redis.set(key, 'true', 3600); // 1 hour

    // Atomic update with row lock
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });
      if (!wallet) throw new BadRequestException('Wallet not found');

      const newBalance = wallet.balance + amount;
      if (newBalance < 0) throw new BadRequestException('Insufficient funds');

      await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // Log to ledger
      await tx.ledgerEntry.create({
        data: {
          id: randomUUID(),
          userId,
          walletId: wallet.id,
          amount,
          type: 'CREDIT',
          description: source,
          balanceAfter: newBalance,
        },
      });

      return { balance: newBalance };
    });
  }

  async debitWallet(userId: string, amount: number, idempotencyKey: string, source: string) {
    // Similar to credit, but for debit
    const key = `wallet:idempotency:${idempotencyKey}`;
    const existing = await this.redis.get(key);
    if (existing) return { status: 'already_processed' };

    await this.redis.set(key, 'true', 3600);

    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });
      if (!wallet || wallet.balance < amount) throw new BadRequestException('Insufficient funds');

      const newBalance = wallet.balance - amount;

      await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      });

      await tx.ledgerEntry.create({
        data: {
          id: randomUUID(),
          userId,
          walletId: wallet.id,
          amount: -amount,
          type: 'DEBIT',
          description: source,
          balanceAfter: newBalance,
        },
      });

      return { balance: newBalance };
    });
  }

  async reconcileWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new BadRequestException('Wallet not found');

    const ledgerSum = await this.prisma.ledgerEntry.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const calculatedBalance = ledgerSum._sum.amount || 0;
    if (calculatedBalance !== wallet.balance) {
      // Log discrepancy
      console.error(`Balance mismatch for ${userId}: DB=${wallet.balance}, Ledger=${calculatedBalance}`);
      // Optionally auto-correct
      await this.prisma.wallet.update({
        where: { userId },
        data: { balance: calculatedBalance },
      });
    }

    return { dbBalance: wallet.balance, ledgerBalance: calculatedBalance };
  }
}