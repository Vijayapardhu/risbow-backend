import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisLockService } from '../common/redis-lock.service';

@Injectable()
export class VendorScoringService {
    private readonly logger = new Logger(VendorScoringService.name);

    constructor(
        private prisma: PrismaService,
        private redisLock: RedisLockService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailyScoring() {
        // 🔐 P0 FIX: Use distributed lock
        await this.redisLock.withLock('cron:vendor-scoring', async () => {
            this.logger.log('Starting Daily Vendor Scoring...');
            await this.calculateAllScores();
            this.logger.log('Daily Vendor Scoring Complete.');
        }, 3600); // 1 hour lock TTL
    }

    async calculateAllScores() {
        const vendors = await this.prisma.vendor.findMany({
            select: { id: true }
        });

        for (const vendor of vendors) {
            await this.calculateVendorScore(vendor.id);
        }

        return { count: vendors.length, message: 'Scoring calculation started' };
    }

    async calculateVendorScore(vendorId: string) {
        try {
            // 1. Reviews (Weight: 40%)
            const reviews = await this.prisma.review.aggregate({
                where: { vendorId, status: 'ACTIVE' },
                _avg: { rating: true },
                _count: true
            });
            const avgRating = reviews._avg.rating || 3.0; // Default 3

            // 2. Returns (Weight: negative)
            // Get returns in key period (e.g. all time or last 30d). For MVP: All time
            const returnCount = await this.prisma.returnRequest.count({
                where: { vendorId }
            });

            // 3. Followers (Popularity)
            const followCount = await this.prisma.vendorFollower.count({
                where: { vendorId }
            });

            // Scoring Formula
            // Base: 50
            // Rating: (Rating - 3) * 20. (5->+40 => 90, 1->-40 => 10).
            // Returns: - (Returns * 2).
            // Popularity: + (Followers / 10).

            let score = 50;
            score += (avgRating - 3) * 20;
            score -= (returnCount * 2);
            score += (followCount / 10);

            // Clamp 0-100
            score = Math.max(0, Math.min(100, score));

            // Update
            await this.prisma.vendor.update({
                where: { id: vendorId },
                data: {
                    performanceScore: parseFloat(score.toFixed(2)),
                    // Auto-downgrade logic could go here
                }
            });

            return score;

        } catch (error) {
            this.logger.error(`Failed to score vendor ${vendorId}: ${error.message}`);
            return 0;
        }
    }
}
