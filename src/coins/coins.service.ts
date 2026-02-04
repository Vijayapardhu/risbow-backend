import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoinSource } from './dto/coin.dto';
import { Prisma, UserRole } from '@prisma/client';
import { CoinValuationService } from './coin-valuation.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CoinsService {
    // 🔐 P0 FIX: EXPIRY CRON - PRESERVE LEDGER HISTORY
    // DO NOT MUTATE amount field - use isExpired flag instead
    async expireCoinsCron() {
        const now = new Date();

        // Find all expired credits that haven't been marked as expired yet
        const expiredCredits = await this.prisma.coinLedger.findMany({
            where: {
                amount: { gt: 0 },
                expiresAt: { lt: now },
                isExpired: false  // Only process unexpired entries
            },
        });

        for (const credit of expiredCredits) {
            // Mark as expired WITHOUT mutating amount (preserves audit trail)
            await this.prisma.coinLedger.update({
                where: { id: credit.id },
                data: { isExpired: true }  // ✅ Preserve amount for audit
            });

            // Recalculate user balance
            await this.recalculateBalance(credit.userId);
        }

        return { expired: expiredCredits.length };
    }

    constructor(
        private prisma: PrismaService,
        private coinValuation: CoinValuationService,
    ) { }

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
            // 🔐 P0 FIX: IDEMPOTENCY CHECK
            // Prevent duplicate credits for same reference
            if (referenceId) {
                const existing = await db.coinLedger.findFirst({
                    where: { userId, referenceId, source, amount: { gt: 0 } }
                });
                if (existing) {
                    // Already credited, return existing user
                    return await db.user.findUnique({ where: { id: userId } });
                }
            }

            const user = await db.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            const roleAtTxn = (user?.role as UserRole) || UserRole.CUSTOMER;
            const paisePerCoinAtTxn = await this.coinValuation.getActivePaisePerCoin(roleAtTxn);

            // Create Ledger Entry
            await db.coinLedger.create({
                data: {
                    id: randomUUID(),
                    userId,
                    amount,
                    source,
                    referenceId,
                    roleAtTxn,
                    paisePerCoinAtTxn,
                    // Expiry logic: 3 months from now
                    expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                    isExpired: false
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
            const user = await db.user.findUnique({
                where: { id: userId },
                select: { coinsBalance: true, role: true },
            });
            if (!user || user.coinsBalance < amount) {
                throw new BadRequestException('Insufficient coin balance');
            }

            const roleAtTxn = (user?.role as UserRole) || UserRole.CUSTOMER;
            const paisePerCoinAtTxn = await this.coinValuation.getActivePaisePerCoin(roleAtTxn);

            // Create Ledger Entry
            await db.coinLedger.create({
                data: {
                    id: randomUUID(),
                    userId,
                    amount: -amount,
                    source,
                    referenceId,
                    roleAtTxn,
                    paisePerCoinAtTxn,
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
        // 🔐 P0 FIX: Use isExpired flag instead of checking expiresAt
        const now = new Date();

        const credits = await this.prisma.coinLedger.aggregate({
            where: {
                userId,
                amount: { gt: 0 },
                isExpired: false,  // Only count non-expired credits
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } }
                ]
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
