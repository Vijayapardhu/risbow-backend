import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CheckoutService {
    constructor(private prisma: PrismaService) { }

    async captureCheckout(data: {
        userId?: string;
        guestInfo?: any;
        cartItems: any[];
        financeDetails: any;
        source?: string;
    }) {
        // 1. Calculate Persuasion Metadata
        const persuasionMetadata = await this.calculatePersuasionMetadata(data.cartItems);

        // 2. Prepare Data
        const checkoutData: Prisma.AbandonedCheckoutCreateInput = {
            user: data.userId ? { connect: { id: data.userId } } : undefined,
            guestInfo: data.guestInfo || {},
            cartSnapshot: data.cartItems,
            financeSnapshot: data.financeDetails,
            metadata: persuasionMetadata,
            status: 'NEW',
            // Store source in metadata or add field if needed. Schema has 'metadata'.
            // prompt says 'source' in persistence. I'll add it to metadata for now if not in schema.
            // Schema has no source field, so metadata is good.
        };

        // 3. Upsert Logic (if userId or guestEmail exists, maybe update existing recent abandoned checkout?)
        // For now, prompt implies new capture. But to avoid duplicates on every step, we might want to return ID and allow updates.
        // Assuming simple CREATE for now as user enters payment page.

        return this.prisma.abandonedCheckout.create({
            data: checkoutData,
        });
    }

    private async calculatePersuasionMetadata(cartItems: any[]) {
        let lowStockCount = 0;
        let activeOffers = [];

        // Check real product data
        for (const item of cartItems) {
            if (!item.productId) continue;
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (product) {
                // Determine stock urgency
                if (product.stock < 10) lowStockCount++;

                // Check if product has offer price
                if (product.offerPrice && product.offerPrice < product.price) {
                    activeOffers.push('DISCOUNTED');
                }
            }
        }

        const stockStatus = lowStockCount > 0 ? 'LOW' : 'MEDIUM';
        const urgencyReason = stockStatus === 'LOW'
            ? `High demand! ${lowStockCount} items in your cart are running low.`
            : 'Order now for faster delivery.';

        return {
            stock_status: stockStatus,
            trending_score: 85, // Trending score could be calculated from recent orders count if needed
            active_offers: [...new Set(activeOffers)], // Unique offers
            estimated_delivery: '2-3 Days',
            urgency_reason: urgencyReason,
            source: 'WEB'
        };
    }

    async getCheckouts(params: {
        skip?: number;
        take?: number;
        cursor?: Prisma.AbandonedCheckoutWhereUniqueInput;
        where?: Prisma.AbandonedCheckoutWhereInput;
        orderBy?: Prisma.AbandonedCheckoutOrderByWithRelationInput;
    }) {
        const { skip, take, cursor, where, orderBy } = params;
        return this.prisma.abandonedCheckout.findMany({
            skip,
            take,
            cursor,
            where,
            orderBy,
            include: {
                user: true,
                agent: true,
                followups: true
            }
        });
    }

    async getCheckoutById(id: string) {
        return this.prisma.abandonedCheckout.findUnique({
            where: { id },
            include: {
                user: true,
                agent: true,
                followups: {
                    include: { agent: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
    }

    async assignLead(checkoutId: string, agentId: string) {
        // Lock Logic: Assign and set lockedUntil to 15 mins from now?
        // Prompt says "Lock lead while agent is active".

        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);

        return this.prisma.abandonedCheckout.update({
            where: { id: checkoutId },
            data: {
                status: 'ASSIGNED',
                agentId,
                lockedUntil
            },
            include: { agent: true }
        });
    }

    async addFollowup(data: { checkoutId: string, agentId: string, note: string, outcome: any }) {
        // Create followup
        const followup = await this.prisma.checkoutFollowup.create({
            data: {
                checkoutId: data.checkoutId,
                agentId: data.agentId,
                note: data.note,
                outcome: data.outcome
            }
        });

        // Update checkout status based on outcome
        let newStatus = 'FOLLOW_UP';
        if (data.outcome === 'CONVERTED') newStatus = 'CONVERTED';
        if (data.outcome === 'DROPPED') newStatus = 'DROPPED';

        await this.prisma.abandonedCheckout.update({
            where: { id: data.checkoutId },
            data: { status: newStatus as any }
        });

        return followup;
    }
}
