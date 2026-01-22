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

    async recalculateBalance(userId: string) {
        // Expiry Logic: Calculate balance based on non-expired credits - all debits
        const now = new Date();

        const credits = await this.prisma.coinLedger.aggregate({
            where: {
                userId,
                amount: { gt: 0 },
                expiresAt: { gt: now } // Only count active credits
            },
            _sum: { amount: true }
        });

        const debits = await this.prisma.coinLedger.aggregate({
            where: {
                userId,
                amount: { lt: 0 }
            },
            _sum: { amount: true }
        });

        const totalCredits = credits._sum.amount || 0;
        const totalDebits = Math.abs(debits._sum.amount || 0);

        // Net Balance
        // Note: This naive logic assumes FIFO is not strictly tracked per credit, 
        // but rather that total credits valid > total spent. 
        // If user spent coins that *would have* expired, this accounts for it (since debits reduce pool).
        const netBalance = Math.max(0, totalCredits - totalDebits);

        // Update User
        await this.prisma.user.update({
            where: { id: userId },
            data: { coinsBalance: netBalance }
        });

        return { balance: netBalance };
    }

    async checkFraud(referrerId: string, refereeId: string, ip?: string, device?: string) {
        // 1. Self Referral Check
        if (referrerId === refereeId) return true;

        // 2. IP/Device Match Check (Prevent excessive referrals from same source)
        if (ip || device) {
            const count = await this.prisma.referralTracking.count({
                where: {
                    referrerId,
                    OR: [
                        { ipAddress: ip },
                        { deviceFingerprint: device }
                    ]
                }
            });

            // If more than 5 referrals from same IP/Device, flag as potential fraud
            if (count > 5) return true;
        }

        return false;
    }
}
