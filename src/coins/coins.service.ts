import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoinSource } from './dto/coin.dto';
import { Prisma } from '@prisma/client';

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

    async credit(userId: string, amount: number, source: CoinSource, referenceId?: string, tx?: Prisma.TransactionClient) {
        const execute = async (db: Prisma.TransactionClient) => {
            // Create Ledger Entry
            await db.coinLedger.create({
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
            const updatedUser = await db.user.update({
                where: { id: userId },
                data: { coinsBalance: { increment: amount } },
            });

            return updatedUser;
        };

        if (tx) {
            return execute(tx);
        } else {
            return this.prisma.$transaction(execute);
        }
    }

    async debit(userId: string, amount: number, source: CoinSource, referenceId?: string, tx?: Prisma.TransactionClient) {
        const execute = async (db: Prisma.TransactionClient) => {
            const user = await db.user.findUnique({ where: { id: userId } });
            if (!user || user.coinsBalance < amount) {
                throw new BadRequestException('Insufficient coin balance');
            }

            // Create Ledger Entry
            await db.coinLedger.create({
                data: {
                    userId,
                    amount: -amount,
                    source,
                    referenceId,
                },
            });

            // Update User Balance
            const updatedUser = await db.user.update({
                where: { id: userId },
                data: { coinsBalance: { decrement: amount } },
            });

            return updatedUser;
        };

        if (tx) {
            return execute(tx);
        } else {
            return this.prisma.$transaction(execute);
        }
    }
}
