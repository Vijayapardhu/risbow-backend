import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchScoringService {
    private readonly logger = new Logger(SearchScoringService.name);

    constructor(private prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async updatePopularityScores() {
        this.logger.log('Starting nightly popularity score update...');

        // 1. Fetch metrics
        // Proxy metrics since Order Items are JSON:
        // - Reviews Count (Verified Purchase proxy)
        // - Ratings (Quality)
        // - Cart Additions (Current Demand)

        const products = await this.prisma.product.findMany({
            select: {
                id: true,
                _count: {
                    select: { reviews: true, cartItems: true }
                },
                reviews: {
                    select: { rating: true }
                }
            }
        });

        const updates = [];

        for (const p of products) {
            const reviewCount = p._count.reviews;
            const cartCount = p._count.cartItems;

            const avgRating = p.reviews.length > 0
                ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
                : 0;

            // Trend Score Formula
            // log(Reviews + 1) * 10 
            // + CartCount * 5 
            // + Rating * 2
            const popularity =
                (Math.log10(reviewCount + 1) * 10) +
                (cartCount * 5) +
                (avgRating * 2);

            updates.push(
                this.prisma.product.update({
                    where: { id: p.id },
                    data: { popularityScore: parseFloat(popularity.toFixed(2)) } as any
                })
            );
        }

        // Execute in transaction
        // Split into chunks if too large in prod
        await this.prisma.$transaction(updates);

        this.logger.log(`Updated popularity scores for ${updates.length} products.`);
    }
}
