import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';

@Injectable()
export class BetService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private walletService: any, // Inject WalletService
  ) {}

  async placeBet(userId: string, selections: any, stake: number, odds: number, idempotencyKey: string) {
    // Idempotency check
    const key = `bet:idempotency:${idempotencyKey}`;
    const existing = await this.redis.get(key);
    if (existing) return { status: 'already_processed' };

    await this.redis.set(key, 'true', 3600);

    const potentialWin = Math.floor(stake * odds);

    return await this.prisma.$transaction(async (tx) => {
      // Debit wallet
      await this.walletService.debitWallet(userId, stake, `bet-${idempotencyKey}`, 'bet_placement');

      const bet = await tx.bet.create({
        data: {
          userId,
          idempotencyKey,
          selections,
          stake,
          odds,
          potentialWin,
          status: 'PLACED',
        },
      });

      return bet;
    });
  }

  async settleBet(betId: string, result: 'WIN' | 'LOSE' | 'VOIDED') {
    return await this.prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({ where: { id: betId } });
      if (!bet || bet.status !== 'PLACED') throw new BadRequestException('Invalid bet');

      let payout = 0;
      if (result === 'WIN') {
        payout = bet.potentialWin;
        await this.walletService.creditWallet(bet.userId, payout, `settle-${betId}`, 'bet_win');
      }

      await tx.bet.update({
        where: { id: betId },
        data: { status: result === 'VOIDED' ? 'VOIDED' : `SETTLED_${result}`, result, payout, settledAt: new Date() },
      });

      return { payout };
    });
  }
}