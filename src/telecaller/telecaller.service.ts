import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelecallerService {
    constructor(private prisma: PrismaService) { }

    async getDashboardStats(telecallerId: string) {
        const [myTasks, completed, pending] = await Promise.all([
            this.prisma.abandonedCheckout.count({ where: { agentId: telecallerId } }),
            this.prisma.abandonedCheckout.count({ where: { agentId: telecallerId, status: 'CONVERTED' } }),
            this.prisma.abandonedCheckout.count({ where: { agentId: telecallerId, status: { in: ['ASSIGNED', 'FOLLOW_UP'] } } })
        ]);

        return {
            myTasks,
            completed,
            pending,
            successRate: myTasks > 0 ? Math.round((completed / myTasks) * 100) : 0
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
            include: { user: true },
            take: 20
        });

        return expiringLedgers.map(l => ({
            name: l.user.name || 'Unknown',
            mobile: l.user.mobile,
            coins: l.amount,
            expiryDate: l.expiresAt,
            daysLeft: Math.ceil((new Date(l.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            lastOrder: 'Unknown' // would need another query
        }));
    }

    async getCheckoutRecoveryLeads(telecallerId: string) {
        // Fetch checkouts assigned to this telecaller or NEW ones if they can pick
        const leads = await this.prisma.abandonedCheckout.findMany({
            where: {
                OR: [
                    { agentId: telecallerId },
                    { status: 'NEW' } // Allow picking up new leads
                ]
            },
            include: { user: true },
            orderBy: { abandonedAt: 'desc' },
            take: 50
        });

        return leads.map(lead => {
            const finance = lead.financeSnapshot as any;
            const items = lead.cartSnapshot as any;
            return {
                id: lead.id,
                customerName: lead.user?.name || (lead.guestInfo as any)?.name || 'Guest',
                mobile: lead.user?.mobile || (lead.guestInfo as any)?.phone || 'N/A',
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
