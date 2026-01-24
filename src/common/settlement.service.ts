import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionService } from './commission.service';
import { RedisLockService } from './redis-lock.service';

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
            const pendingSettlements = await (this.prisma as any).orderSettlement.findMany({
                where: {
                    status: 'PENDING',
                    order: {
                        status: 'DELIVERED',
                        deliveredAt: { lte: sevenDaysAgo }
                    }
                }
            });

            for (const settlement of pendingSettlements) {
                await (this.prisma as any).orderSettlement.update({
                    where: { id: settlement.id },
                    data: {
                        status: 'ELIGIBLE',
                        eligibleAt: new Date()
                    }
                });
            }

            this.logger.log(`Marked ${pendingSettlements.length} settlements as ELIGIBLE`);

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
                // 1. Atomically credit vendor pending earnings
                await tx.vendor.update({
                    where: { id: settlement.vendorId },
                    data: {
                        pendingEarnings: { increment: settlement.amount }
                    }
                });

                // 2. Mark settlement as SETTLED
                await (tx as any).orderSettlement.update({
                    where: { id: settlement.id },
                    data: {
                        status: 'SETTLED',
                        settledAt: new Date()
                    }
                });

                // 3. Create historical Payout record
                await tx.vendorPayout.create({
                    data: {
                        vendorId: settlement.vendorId,
                        amount: settlement.amount,
                        period: new Date().toISOString().slice(0, 7),
                        status: 'COMPLETED',
                        processedAt: new Date(),
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

        return stats.reduce((acc, curr) => {
            acc[curr.status] = {
                count: curr._count,
                amount: curr._sum.amount || 0
            };
            return acc;
        }, {});
    }
}