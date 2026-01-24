import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PriceResolverService } from '../common/price-resolver.service';
import { CommissionService } from '../common/commission.service';

/**
 * Cart Abandonment Service
 * 
 * Detects abandoned carts and creates recovery leads.
 * A cart is considered abandoned if:
 * - User has items in cart
 * - Cart not updated in >30 minutes (configurable)
 * - No checkout initiated
 */
@Injectable()
export class CartAbandonmentService {
    private readonly logger = new Logger(CartAbandonmentService.name);
    private readonly abandonmentThresholdMinutes: number;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private priceResolver: PriceResolverService,
        private commissionService: CommissionService,
    ) {
        // Default 30 minutes, configurable via env
        this.abandonmentThresholdMinutes = parseInt(
            this.configService.get('CART_ABANDONMENT_THRESHOLD_MINUTES') || '30',
            10
        );
    }

    /**
     * Detects abandoned carts and creates AbandonedCheckout records.
     * This should be called by a cron job periodically.
     */
    async detectAbandonedCarts(): Promise<number> {
        this.logger.log('Starting abandoned cart detection...');

        const thresholdTime = new Date();
        thresholdTime.setMinutes(thresholdTime.getMinutes() - this.abandonmentThresholdMinutes);

        // Find carts that:
        // 1. Have items (cartItems count > 0)
        // 2. Haven't been updated in threshold minutes
        // 3. Don't already have an active abandoned checkout record
        const abandonedCarts = await this.prisma.cart.findMany({
            where: {
                updatedAt: { lte: thresholdTime },
                items: { some: {} }, // Has at least one item
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                category: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        id: true,
                        mobile: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        let createdCount = 0;

        for (const cart of abandonedCarts) {
            // Check if user already has an active abandoned checkout for this cart
            const existingCheckout = await this.prisma.abandonedCheckout.findFirst({
                where: {
                    userId: cart.userId,
                    status: { in: ['NEW', 'ASSIGNED', 'FOLLOW_UP'] },
                    metadata: {
                        path: ['type'],
                        equals: 'CART',
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            // Skip if already has an active abandonment record
            if (existingCheckout) {
                continue;
            }

            try {
                // Calculate cart value and create snapshot
                const cartSnapshot = await this.createCartSnapshot(cart);
                const financeSnapshot = await this.createFinanceSnapshot(cart);

                // Create AbandonedCheckout record with type: 'CART'
                await this.prisma.abandonedCheckout.create({
                    data: {
                        userId: cart.userId,
                        cartSnapshot,
                        financeSnapshot,
                        status: 'NEW',
                        abandonReason: 'CART_TIMEOUT',
                        metadata: {
                            type: 'CART',
                            cartId: cart.id,
                            detectedAt: new Date().toISOString(),
                            thresholdMinutes: this.abandonmentThresholdMinutes,
                        },
                        abandonedAt: cart.updatedAt, // Use cart's last update time
                    },
                });

                createdCount++;
                this.logger.debug(`Created abandoned cart record for user ${cart.userId}, cart ${cart.id}`);
            } catch (error) {
                this.logger.error(
                    `Failed to create abandoned cart record for user ${cart.userId}: ${error.message}`
                );
            }
        }

        this.logger.log(`Abandoned cart detection complete. Created ${createdCount} new records.`);
        return createdCount;
    }

    /**
     * Creates a cart snapshot for the abandoned checkout record.
     */
    private async createCartSnapshot(cart: any): Promise<any> {
        return {
            cartId: cart.id,
            items: cart.items.map((item: any) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                productTitle: item.product.title,
                productImage: item.product.images?.[0] || null,
                categoryId: item.product.categoryId,
            })),
            itemCount: cart.items.length,
            totalItems: cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        };
    }

    /**
     * Creates a finance snapshot for the abandoned checkout record.
     */
    private async createFinanceSnapshot(cart: any): Promise<any> {
        let totalBasePrice = 0;
        let totalTaxAmount = 0;
        let totalCommissionAmount = 0;

        for (const item of cart.items) {
            const unitPrice = await this.priceResolver.resolvePrice(
                item.productId,
                item.variantId || undefined
            );
            const itemPrice = unitPrice * item.quantity;
            totalBasePrice += itemPrice;
            totalTaxAmount += this.priceResolver.calculateTax(itemPrice);

            if (item.product?.categoryId) {
                const commissionAmount = await this.commissionService.calculateCommission(
                    itemPrice,
                    item.product.categoryId,
                    item.product.vendorId
                );
                totalCommissionAmount += commissionAmount;
            }
        }

        const shippingFee = 5000; // ₹50 default shipping
        const totalAmount = totalBasePrice + totalTaxAmount + shippingFee;

        return {
            subtotal: totalBasePrice,
            taxAmount: totalTaxAmount,
            shippingAmount: shippingFee,
            discountAmount: 0,
            totalAmount,
            commissionAmount: totalCommissionAmount,
            currency: 'INR',
        };
    }

    /**
     * Gets abandonment statistics for analytics.
     */
    async getAbandonmentStats(days: number = 7): Promise<any> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [totalAbandoned, recovered] = await Promise.all([
            this.prisma.abandonedCheckout.count({
                where: {
                    createdAt: { gte: since },
                    metadata: { path: ['type'], equals: 'CART' },
                },
            }),
            this.prisma.abandonedCheckout.count({
                where: {
                    createdAt: { gte: since },
                    status: 'CONVERTED',
                    metadata: { path: ['type'], equals: 'CART' },
                },
            }),
        ]);

        return {
            totalAbandoned,
            recovered,
            recoveryRate: totalAbandoned > 0 ? (recovered / totalAbandoned) * 100 : 0,
            periodDays: days,
        };
    }
}
