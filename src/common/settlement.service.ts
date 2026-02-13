import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionService } from './commission.service';
import { RedisLockService } from './redis-lock.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SettlementService {
    private readonly logger = new Logger(SettlementService.name);

    constructor(
        private prisma: PrismaService,
        private commissionService: CommissionService,
        private redisLock: RedisLockService,
    ) { }

    /**
     * Automated settlement cron job - runs every 6 hours
     * Finds delivered orders older than 7 days that haven't been settled
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async processSettlements() {
        // 🔐 P0 FIX: Use distributed lock to prevent concurrent execution
        await this.redisLock.withLock('cron:settlement', async () => {
            this.logger.log('Starting automated settlement process...');

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            try {
            // 1. Move PENDING settlements to ELIGIBLE if older than 7 days
            // Use updateMany in a single query instead of N individual updates
            const eligibleResult = await (this.prisma as any).orderSettlement.updateMany({
                where: {
                    status: 'PENDING',
                    order: {
                        status: 'DELIVERED',
                        deliveredAt: { lte: sevenDaysAgo }
                    }
                },
                data: {
                    status: 'ELIGIBLE',
                    eligibleAt: new Date()
                }
            });

            this.logger.log(`Marked ${eligibleResult.count} settlements as ELIGIBLE`);

            // 2. Process ELIGIBLE settlements to SETTLED 
            const eligibleSettlements = await (this.prisma as any).orderSettlement.findMany({
                where: { status: 'ELIGIBLE' },
                include: { order: { include: { financialSnapshot: true } } }
            });

            for (const settlement of eligibleSettlements) {
                await this.finalizeSettlement(settlement);
            }

                this.logger.log('Settlement process completed');
            } catch (error) {
                this.logger.error(`Settlement process failed: ${error.message}`);
            }
        }, 21600); // 6 hour lock TTL
    }

    private async finalizeSettlement(settlement: any) {
        try {
            await this.prisma.$transaction(async (tx) => {
                // IDEMPOTENCY GUARD: Only update if still in ELIGIBLE status
                // This prevents double-processing if the cron runs concurrently
                const updated = await (tx as any).orderSettlement.updateMany({
                    where: { id: settlement.id, status: 'ELIGIBLE' },
                    data: {
                        status: 'SETTLED',
                        settledAt: new Date()
                    }
                });

                // If count === 0, another process already settled this — skip
                if (updated.count === 0) {
                    this.logger.warn(`Settlement ${settlement.id} already processed, skipping`);
                    return;
                }

                // Atomically credit vendor pending earnings
                await tx.vendor.update({
                    where: { id: settlement.vendorId },
                    data: {
                        pendingEarnings: { increment: settlement.amount }
                    }
                });

                // Create historical Payout record
                await tx.vendorPayout.create({
                    data: {
                        id: randomUUID(),
                        vendorId: settlement.vendorId,
                        amount: settlement.amount,
                        period: new Date().toISOString().slice(0, 7),
                        status: 'COMPLETED',
                        processedAt: new Date(),
                        updatedAt: new Date(),
                        bankDetails: {
                            orderId: settlement.orderId,
                            settlementType: 'AUTOMATED_FINALIZE'
                        }
                    }
                });
            });
        } catch (error) {
            this.logger.error(`Failed to finalize settlement ${settlement.id}: ${error.message}`);
        }
    }

    async getSettlementStats() {
        const stats = await (this.prisma as any).orderSettlement.groupBy({
            by: ['status'],
            _sum: { amount: true },
            _count: true
        });

        return stats.reduce((acc: Record<string, { count: number; amount: number }>, curr: { status: string; _count: number; _sum: { amount: number | null } }) => {
            acc[curr.status] = {
                count: curr._count,
                amount: curr._sum.amount || 0
            };
            return acc;
        }, {});
    }
}