import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BowRevenueService {
    private readonly logger = new Logger(BowRevenueService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Records the performance of a Bow action.
     * Links a Bow action to an eventual order for ROI calculation.
     */
    async attributeOutcome(orderId: string, userId: string) {
        // Find recent Bow actions (last 2 hours)
        const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const recentActions = await (this.prisma as any).bowActionLog.findMany({
            where: {
                userId,
                createdAt: { gte: cutoff },
                status: 'CONFIRMED' // Action was accepted/confirmed by user
            },
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (recentActions.length > 0) {
            const action = recentActions[0];
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                select: { totalAmount: true }
            });

            if (order) {
                // Update log with attributed revenue
                await (this.prisma as any).bowActionLog.update({
                    where: { id: action.id },
                    data: {
                        metadata: {
                            attributedOrderId: orderId,
                            attributedRevenue: order.totalAmount
                        }
                    }
                });
                this.logger.log(`Order ${orderId} attributed to Bow action ${action.id}`);
            }
        }
    }

    /**
     * Gets ROI stats for Bow.
     */
    async getBowROI() {
        const logs = await (this.prisma as any).bowActionLog.findMany({
            where: {
                metadata: { path: ['attributedRevenue'], not: null }
            }
        });

        const totalAttributed = logs.reduce((sum, log) => sum + (log.metadata as any).attributedRevenue, 0);
        const totalActions = await (this.prisma as any).bowActionLog.count();

        return {
            totalRevenue: totalAttributed,
            totalActions,
            conversionRate: totalActions > 0 ? (logs.length / totalActions) * 100 : 0
        };
    }
}
