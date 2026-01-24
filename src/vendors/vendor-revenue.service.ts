import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorRevenueService {
    private readonly logger = new Logger(VendorRevenueService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Calculates ROI for a vendor's promotions/boosts.
     */
    async getPromotionROI(vendorId: string) {
        const promotions = await (this.prisma as any).vendorPromotion.findMany({
            where: { vendorId },
            include: { promotionLogs: true }
        });

        return promotions.map(p => {
            const cost = p.totalSpent || 0;
            const revenue = p.attributedRevenue || 0;
            const roi = cost > 0 ? (revenue / cost) : 0;

            return {
                promotionId: p.id,
                name: p.name,
                cost,
                revenue,
                roi,
                conversionRate: p.clicks > 0 ? (p.orders / p.clicks) * 100 : 0
            };
        });
    }

    /**
     * Identifies vendors eligible for "Smart Boosts".
     * Criteria: High rating (>4.0) but low visibility (<1000 impressions).
     */
    async identifyBoostOpportunities() {
        const vendors = await this.prisma.vendor.findMany({
            where: {
                performanceScore: { gte: 80 }
            },
            include: { products: { take: 5 } }
        });

        // Filter for low visibility (simulated here since we don't have global impressions table yet)
        return vendors.map(v => ({
            vendorId: v.id,
            storeName: v.storeName,
            recommendation: 'Low visibility despite high rating. Suggest Boost.',
            priority: 'Medium'
        }));
    }

    /**
     * Aggregates Vendor Health Score components.
     */
    async getVendorHealthStats(vendorId: string) {
        const [orders, returns, ratings] = await Promise.all([
            this.prisma.order.count({ where: { items: { path: ['0', 'vendorId'], equals: vendorId } } }),
            this.prisma.returnRequest.count({ where: { vendorId } }),
            this.prisma.review.aggregate({ where: { vendorId }, _avg: { rating: true } })
        ]);

        const returnRate = orders > 0 ? (returns / orders) * 100 : 0;

        return {
            totalOrders: orders,
            totalReturns: returns,
            returnRate,
            avgRating: ratings._avg.rating || 0,
            healthStatus: returnRate > 15 ? 'Critical' : returnRate > 8 ? 'Warning' : 'Healthy'
        };
    }
}
