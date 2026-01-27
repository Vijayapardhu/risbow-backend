import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutRecoveryStatus } from '@prisma/client';
import { RedisService } from '../shared/redis.service';

@Injectable()
export class RecoveryService {
    private readonly logger = new Logger(RecoveryService.name);

    constructor(
        private prisma: PrismaService,
        private redisService: RedisService,
    ) { }

    /**
     * Calculates a risk score (0-100) for an abandoned checkout.
     * Higher score = Higher priority / risk of loss.
     */
    async calculateAbandonRiskScore(checkoutId: string): Promise<number> {
        const checkout = await this.prisma.abandonedCheckout.findUnique({
            where: { id: checkoutId },
            include: { user: { include: { cartInsights: { orderBy: { triggeredAt: 'desc' }, take: 1 } } } }
        });

        if (!checkout) return 0;

        let score = 0;

        // 1. Core Intent Risk (from CartInsight) - 40% weight
        const latestInsight = checkout.user?.cartInsights?.[0];
        if (latestInsight) {
            score += (latestInsight.abandonRisk * 0.4);
            // Hesitation also adds to risk
            score += (latestInsight.hesitationScore * 0.1);
        }

        // 2. Financial Stakes (Cart Value) - 30% weight
        const finance = checkout.financeSnapshot as any;
        const cartValue = finance?.totalAmount || 0;
        // Max score for carts > ₹10,000
        const valueScore = Math.min((cartValue / 10000) * 100, 100);
        score += (valueScore * 0.3);

        // 3. Technical Friction (Payment Failures) - 20% weight
        const metadata = (checkout.metadata as any) || {};
        if (metadata.abandonReason === 'PAYMENT_FAILED') {
            score += 20;
        }

        // 4. Urgency (Time since abandoned) - 10% weight
        // This is dynamic, but at save time we can base it on previous abandons
        const previousAbandons = await this.prisma.abandonedCheckout.count({
            where: { userId: checkout.userId, status: 'DROPPED' }
        });
        score += Math.min(previousAbandons * 5, 10);

        return Math.min(Math.round(score), 100);
    }

    /**
     * Periodically called to score and assign leads to telecallers.
     */
    async processNewLeads() {
        const newLeads = await this.prisma.abandonedCheckout.findMany({
            where: { status: CheckoutRecoveryStatus.NEW },
            take: 100
        });

        for (const lead of newLeads) {
            const riskScore = await this.calculateAbandonRiskScore(lead.id);

            // Store score in metadata
            const metadata = (lead.metadata as any) || {};
            metadata.riskScore = riskScore;
            metadata.scoredAt = new Date();

            await this.prisma.abandonedCheckout.update({
                where: { id: lead.id },
                data: { metadata }
            });

            // If high priority, auto-assign to best available agent
            if (riskScore > 75) {
                await this.assignToBestAgent(lead.id);
            }
        }
    }

    private async assignToBestAgent(checkoutId: string) {
        // Find agents with least load who are TELECALLER role
        const agents = await this.prisma.user.findMany({
            where: { role: 'TELECALLER', status: 'ACTIVE' },
            include: { _count: { select: { assignedLeads: { where: { status: 'ASSIGNED' } } } } },
            orderBy: { assignedLeads: { _count: 'asc' } },
            take: 1
        });

        if (agents.length > 0) {
            await this.prisma.abandonedCheckout.update({
                where: { id: checkoutId },
                data: {
                    agentId: agents[0].id,
                    status: CheckoutRecoveryStatus.ASSIGNED
                }
            });
            this.logger.log(`Lead ${checkoutId} assigned to senior agent ${agents[0].id}`);
        }
    }

    /**
     * Detects abandoned checkouts based on Redis TTL expiry.
     * When payment timeout TTL expires, the checkout is marked as abandoned.
     * 
     * Note: In production, consider using Redis keyspace notifications for real-time detection.
     */
    async detectAbandonedCheckoutsFromRedis(): Promise<number> {
        this.logger.log('Checking for Redis TTL-expired payment timeouts...');

        // Find orders in PENDING_PAYMENT status that should have been paid by now
        // Check if their Redis TTL has expired (key doesn't exist)
        const paymentTimeoutMinutes = parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '10', 10);
        const timeoutThreshold = new Date();
        timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - paymentTimeoutMinutes);

        // Find orders that are still PENDING_PAYMENT and were created before threshold
        const pendingOrders = await this.prisma.order.findMany({
            where: {
                status: 'PENDING_PAYMENT',
                createdAt: { lte: timeoutThreshold },
                razorpayOrderId: { not: null },
            },
            take: 100, // Process in batches
        });

        let detectedCount = 0;

        for (const order of pendingOrders) {
            // Check if Redis key still exists (payment not completed)
            const timeoutKey = `payment:timeout:${order.id}`;
            const keyExists = await this.redisService.exists(timeoutKey);

            // If key doesn't exist, TTL expired - checkout is abandoned
            if (!keyExists) {
                // Find or create abandoned checkout
                let abandonedCheckout = await this.prisma.abandonedCheckout.findFirst({
                    where: {
                        metadata: {
                            path: ['orderId'],
                            equals: order.id,
                        },
                    },
                });

                if (!abandonedCheckout) {
                    // Create abandoned checkout if it doesn't exist
                    abandonedCheckout = await this.prisma.abandonedCheckout.create({
                        data: {
                            userId: order.userId,
                            cartSnapshot: order.items as any,
                            financeSnapshot: {
                                totalAmount: order.totalAmount * 100, // Convert to paise
                                currency: 'INR',
                            },
                            status: 'NEW',
                            abandonReason: 'PAYMENT_TIMEOUT',
                            paymentMethod: 'ONLINE',
                            metadata: {
                                type: 'CHECKOUT',
                                orderId: order.id,
                                razorpayOrderId: order.razorpayOrderId,
                                detectedVia: 'REDIS_TTL',
                                detectedAt: new Date().toISOString(),
                            },
                            abandonedAt: order.createdAt, // Use order creation time
                        },
                    });
                    detectedCount++;
                    this.logger.log(`Detected abandoned checkout via Redis TTL for order ${order.id}`);
                } else if (abandonedCheckout.status === 'NEW') {
                    // Update existing checkout if still new
                    await this.prisma.abandonedCheckout.update({
                        where: { id: abandonedCheckout.id },
                        data: {
                            abandonReason: 'PAYMENT_TIMEOUT',
                            metadata: {
                                ...(abandonedCheckout.metadata as any || {}),
                                detectedVia: 'REDIS_TTL',
                                ttlExpiredAt: new Date().toISOString(),
                            },
                        },
                    });
                }
            }
        }

        if (detectedCount > 0) {
            this.logger.log(`Detected ${detectedCount} abandoned checkouts via Redis TTL expiry`);
        }

        return detectedCount;
    }

    /**
     * Escalates abandoned checkouts through various stages based on time passed.
     */
    async escalateCheckouts() {
        const now = new Date();

        // First, detect any checkouts abandoned via Redis TTL expiry
        await this.detectAbandonedCheckoutsFromRedis();

        // 1. T+15-30 min: Push Discovery Stage
        const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000);
        const thirtyMinsAgo = new Date(now.getTime() - 30 * 60000);

        // Fetch all leads in time range, then filter in memory for undefined escalationLevel
        const allPushLeads = await this.prisma.abandonedCheckout.findMany({
            where: {
                status: CheckoutRecoveryStatus.NEW,
                abandonedAt: { lte: fifteenMinsAgo, gte: thirtyMinsAgo },
            },
        });
        
        // Filter for leads where escalationLevel is undefined or doesn't exist
        const pushLeads = allPushLeads.filter(lead => {
            const metadata = lead.metadata as any;
            return !metadata || metadata.escalationLevel === undefined || metadata.escalationLevel === null;
        });

        for (const lead of pushLeads) {
            this.logger.log(`T+15: Sending discovery Push to user ${lead.userId} for checkout ${lead.id}`);
            // Logic: Update metadata to track escalation
            await this.prisma.abandonedCheckout.update({
                where: { id: lead.id },
                data: { metadata: { ...(lead.metadata as any || {}), escalationLevel: 'PUSH_SENT', lastEscalatedAt: now } }
            });
        }

        // 2. T+60-120 min: WhatsApp Retention Stage
        const oneHourAgo = new Date(now.getTime() - 60 * 60000);
        const twoHoursAgo = new Date(now.getTime() - 120 * 60000);

        const waLeads = await this.prisma.abandonedCheckout.findMany({
            where: {
                status: CheckoutRecoveryStatus.NEW,
                abandonedAt: { lte: oneHourAgo, gte: twoHoursAgo },
                metadata: { path: ['escalationLevel'], equals: 'PUSH_SENT' }
            }
        });

        for (const lead of waLeads) {
            this.logger.log(`T+60: Sending WhatsApp retention nudge to ${lead.userId}`);
            await this.prisma.abandonedCheckout.update({
                where: { id: lead.id },
                data: { metadata: { ...(lead.metadata as any || {}), escalationLevel: 'WA_NUDGE_SENT', lastEscalatedAt: now } }
            });
        }

        // 3. T+240 min+: Telecaller Priority Stage
        const fourHoursAgo = new Date(now.getTime() - 240 * 60000);

        // Fetch all leads, then filter for those not assigned to telecaller
        const allCallLeads = await this.prisma.abandonedCheckout.findMany({
            where: {
                status: CheckoutRecoveryStatus.NEW,
                abandonedAt: { lte: fourHoursAgo },
            },
        });
        
        // Filter for leads where escalationLevel is not 'TELE_ASSIGNED'
        const callLeads = allCallLeads.filter(lead => {
            const metadata = lead.metadata as any;
            return !metadata || metadata.escalationLevel !== 'TELE_ASSIGNED';
        });

        for (const lead of callLeads) {
            this.logger.log(`T+240: Escalating checkout ${lead.id} to Senior Telecaller queue`);
            await this.assignToBestAgent(lead.id);
            await this.prisma.abandonedCheckout.update({
                where: { id: lead.id },
                data: { metadata: { ...(lead.metadata as any || {}), escalationLevel: 'TELE_ASSIGNED', lastEscalatedAt: now } }
            });
        }
    }
}
