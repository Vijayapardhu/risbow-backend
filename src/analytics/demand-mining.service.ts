import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DemandMiningService {
    private readonly logger = new Logger(DemandMiningService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Mines ProductSearchMiss data to identify high-demand missing products.
     */
    async identifyDemandGaps() {
        const misses = await this.prisma.productSearchMiss.findMany({
            where: { resolved: false },
            orderBy: { count: 'desc' },
            take: 20
        });

        return misses.map(m => ({
            query: m.query,
            totalRequests: m.count,
            lastRequested: m.lastSearchedAt,
            keywords: m.keywords,
            opportunityScore: m.count * 10 // Simple score
        }));
    }

    /**
     * Groups demand by category for vendor planning.
     */
    async getCategoryDemandReport() {
        // Group by normalized keyword or inferred category
        const allMisses = await this.prisma.productSearchMiss.findMany({
            where: { resolved: false }
        });

        const categorySummary = {};
        for (const miss of allMisses) {
            const metadata = miss.metadata as any;
            const cat = metadata?.inferredCategoryName || 'Uncategorized';
            if (!categorySummary[cat]) categorySummary[cat] = 0;
            categorySummary[cat] += miss.count;
        }

        return Object.entries(categorySummary)
            .map(([category, count]) => ({ category, count: count as number }))
            .sort((a, b) => b.count - a.count);
    }
}
