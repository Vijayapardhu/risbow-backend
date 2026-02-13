
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAnalyticsService {
    private readonly logger = new Logger(AdminAnalyticsService.name);

    constructor(private prisma: PrismaService) { }

    // 1️⃣ Demand Intelligence (Top Missed Searches)
    async getDemandIntelligence(days = 30) {
        const misses = await this.prisma.productSearchMiss.findMany({
            where: {
                lastSearchedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
                resolved: false
            },
            orderBy: { count: 'desc' },
            take: 20
        });

        // Group by category if available
        const categoryGaps: Record<string, number> = {};
        misses.forEach(m => {
            const cat = (m.metadata as any)?.inferredCategoryName || 'Unknown';
            if (!categoryGaps[cat]) categoryGaps[cat] = 0;
            categoryGaps[cat] += m.count;
        });

        return {
            topMissedQueries: misses,
            categoryDemand: categoryGaps
        };
    }

    // 2️⃣ Bow Performance (Attribution & Strategies)
    async getBowPerformance() {
        const totalRecommendations = await this.prisma.recommendationEvent.count();
        const acceptedRecommendations = await this.prisma.recommendationEvent.count({
            where: { accepted: true }
        });

        const attributionValue = await this.prisma.recommendationEvent.aggregate({
            where: { accepted: true },
            _sum: { cartValueAfter: true } // Proxied via cart value uplift logic? 
            // Actually our conversion tracking stored item value in BowInteraction,
            // but RecommendationEvent stores cartValueAfter.
            // Let's use BowInteraction conversionValue for precise revenue.
        });

        const revenueAttributed = await this.prisma.bowInteraction.aggregate({
            where: {
                conversionEvent: { not: null }
            },
            _sum: { conversionValue: true }
        });

        const strategyStats = await this.prisma.recommendationEvent.groupBy({
            by: ['strategy'],
            _count: { id: true },
            where: { accepted: true }
        });

        return {
            totalSuggestions: totalRecommendations,
            conversionRate: totalRecommendations > 0 ? (acceptedRecommendations / totalRecommendations) * 100 : 0,
            revenueGenerated: revenueAttributed._sum.conversionValue || 0,
            bestStrategy: strategyStats.sort((a, b) => b._count.id - a._count.id)[0] || null
        };
    }
}
