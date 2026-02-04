import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutRecoveryStatus } from '@prisma/client';

@Injectable()
export class TelecallerService {
    private readonly logger = new Logger(TelecallerService.name);
    private readonly lockExpirationHours = 24; // Locks expire after 24 hours

    constructor(private prisma: PrismaService) { }

    async logPerformance(agentId: string, action: 'ASSIGNED' | 'CONTACTED' | 'CONVERTED' | 'DROPPED') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const data: any = {};
        if (action === 'ASSIGNED') data.assigned = { increment: 1 };
        if (action === 'CONTACTED') data.contacted = { increment: 1 };
        if (action === 'CONVERTED') data.converted = { increment: 1 };
        if (action === 'DROPPED') data.dropped = { increment: 1 };

        return (this.prisma as any).telecallerPerformance.upsert({
            where: { agentId_date: { agentId, date: today } },
            update: data,
            create: {
                agentId,
                date: today,
                assigned: action === 'ASSIGNED' ? 1 : 0,
                contacted: action === 'CONTACTED' ? 1 : 0,
                converted: action === 'CONVERTED' ? 1 : 0,
                dropped: action === 'DROPPED' ? 1 : 0,
            }
        });
    }

    async getDashboardStats(telecallerId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [myTasks, completed, pending, performance] = await Promise.all([
            this.prisma.abandonedCheckout.count({ where: { agentId: telecallerId } }),
            this.prisma.abandonedCheckout.count({ where: { agentId: telecallerId, status: 'CONVERTED' } }),
            this.prisma.abandonedCheckout.count({ where: { agentId: telecallerId, status: { in: ['ASSIGNED', 'FOLLOW_UP'] } } }),
            (this.prisma as any).telecallerPerformance.findUnique({
                where: { agentId_date: { agentId: telecallerId, date: today } }
            })
        ]);

        return {
            myTasks,
            completed,
            pending,
            successRate: myTasks > 0 ? Math.round((completed / myTasks) * 100) : 0,
            todayStats: performance || { assigned: 0, contacted: 0, converted: 0, dropped: 0 }
        };
    }

    async getExpiringCoins() {
        // Fetch users who have coins in ledger expiring soon (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        // Grouping isn't straightforward in raw prisma for this without raw query or logic.
        // We'll fetch ledgers expiring soon.
        const expiringLedgers = await this.prisma.coinLedger.findMany({
            where: {
                expiresAt: {
                    gte: new Date(),
                    lte: nextWeek
                },
                // source: { not: 'SPENT' } // Assuming we filter spent? Ledger is history. 
                // Actually ledger tracks credit/debit. 'expiresAt' usually on CREDIT entries.
                // We need to check if user still has balance? simplified: notify about expiry.
            },
            include: { User: true },
            take: 20
        });

        return expiringLedgers.map(l => ({
            name: l.User.name || 'Unknown',
            mobile: l.User.mobile,
            coins: l.amount,
            expiryDate: l.expiresAt,
            daysLeft: Math.ceil((new Date(l.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            lastOrder: 'Unknown' // would need another query
        }));
    }

    /**
     * Releases expired telecaller locks to prevent lead hoarding.
     * Locks expire after 24 hours without followup.
     */
    async releaseExpiredLocks(): Promise<number> {
        const expirationThreshold = new Date();
        expirationThreshold.setHours(expirationThreshold.getHours() - this.lockExpirationHours);

        const expiredLocks = await this.prisma.abandonedCheckout.findMany({
            where: {
                status: { in: ['ASSIGNED', 'FOLLOW_UP'] },
                lockedUntil: { lte: expirationThreshold },
            },
        });

        let releasedCount = 0;

        for (const checkout of expiredLocks) {
            await this.prisma.abandonedCheckout.update({
                where: { id: checkout.id },
                data: {
                    agentId: null,
                    lockedUntil: null,
                    status: CheckoutRecoveryStatus.NEW, // Reset to NEW so it can be reassigned
                    metadata: {
                        ...(checkout.metadata as any || {}),
                        lockExpiredAt: new Date().toISOString(),
                        previousAgentId: checkout.agentId,
                    },
                },
            });

            releasedCount++;
            this.logger.log(`Released expired lock for checkout ${checkout.id} (was assigned to ${checkout.agentId})`);
        }

        if (releasedCount > 0) {
            this.logger.log(`Released ${releasedCount} expired telecaller locks`);
        }

        return releasedCount;
    }

    async getCheckoutRecoveryLeads(telecallerId: string) {
        // 🔐 P0 FIX: Release expired locks before fetching leads
        await this.releaseExpiredLocks().catch(err => {
            this.logger.warn(`Failed to release expired locks: ${err.message}`);
        });

        // Fetch checkouts assigned to this telecaller or NEW ones if they can pick
        const leads = await this.prisma.abandonedCheckout.findMany({
            where: {
                OR: [
                    { agentId: telecallerId },
                    { status: 'NEW' } // Allow picking up new leads
                ]
            },
            include: { User: true },
            orderBy: { abandonedAt: 'desc' },
            take: 50
        });

        return leads.map(lead => {
            const finance = lead.financeSnapshot as any;
            const items = lead.cartSnapshot as any;
            return {
                id: lead.id,
                customerName: lead.User?.name || (lead.guestInfo as any)?.name || 'Guest',
                mobile: lead.User?.mobile || (lead.guestInfo as any)?.phone || 'N/A',
                cartValue: finance?.totalAmount || 0,
                itemCount: Array.isArray(items) ? items.length : 0,
                abandonedAt: lead.abandonedAt,
                priority: (finance?.totalAmount || 0) > 5000 ? 'High' : 'Normal',
                status: lead.status
            };
        });
    }

    async getSupportTickets() {
        // Using 'Report' as proxy for support tickets
        const reports = await this.prisma.report.findMany({
            where: { status: 'PENDING' },
            include: { reporter: true },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        return reports.map(r => ({
            id: r.id,
            subject: `Report against ${r.targetType}`,
            description: r.reason,
            customerName: r.reporter.name,
            mobile: r.reporter.mobile,
            priority: 'Normal',
            createdAt: r.createdAt
        }));
    }
}
