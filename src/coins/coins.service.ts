import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoinSource } from './dto/coin.dto';

@Injectable()
export class CoinsService {
    constructor(private prisma: PrismaService) { }

    async getBalance(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { coinsBalance: true },
        });
        return { balance: user?.coinsBalance || 0 };
    }

    async getLedger(userId: string) {
        return this.prisma.coinLedger.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20, // Pagination can be added later
        });
    }

    async credit(userId: string, amount: number, source: CoinSource, referenceId?: string) {
        return this.prisma.$transaction(async (tx) => {
            // Create Ledger Entry
            await tx.coinLedger.create({
                data: {
                    userId,
                    amount,
                    source,
                    referenceId,
                    // Expiry logic: 3 months from now (simplified)
                    expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                },
            });

            // Update User Balance
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coinsBalance: { increment: amount } },
            });

            return updatedUser;
        });
    }

    async debit(userId: string, amount: number, source: CoinSource, referenceId?: string) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || user.coinsBalance < amount) {
                throw new BadRequestException('Insufficient coin balance');
            }

            // Create Ledger Entry (negative amount for debit? Schema says amount, usually helpful to store sign or type. 
            // SRS says amount(+earn/-spend). So we store negative for spend.
            await tx.coinLedger.create({
                data: {
                    userId,
                    amount: -amount,
                    source,
                    referenceId,
                },
            });

            // Update User Balance
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coinsBalance: { decrement: amount } },
            });

            return updatedUser;
        });
    }
}
