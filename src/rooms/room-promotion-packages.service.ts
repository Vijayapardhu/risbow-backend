import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionType, PromotionStatus, PaymentIntentPurpose, UserRole } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { CoinValuationService } from '../coins/coin-valuation.service';

/**
 * Room Promotion Packages Service
 * 
 * Implements vendor room promotion packages:
 * - 2x visibility package (₹2,000)
 * - 3x visibility package (₹3,000)
 * - 4x visibility package (₹5,000)
 * 
 * Vendors can purchase these packages to promote their products in rooms.
 */
@Injectable()
export class RoomPromotionPackagesService {
    private readonly logger = new Logger(RoomPromotionPackagesService.name);

    // Package pricing in paise
    private readonly packagePricing = {
        '2X_VISIBILITY': 200000,  // ₹2,000
        '3X_VISIBILITY': 300000,  // ₹3,000
        '4X_VISIBILITY': 500000,  // ₹5,000
    };

    constructor(
        private prisma: PrismaService,
        private paymentsService: PaymentsService,
        private coinValuation: CoinValuationService,
    ) {}

    /**
     * Purchase a room promotion package
     * 
     * @param vendorId - Vendor ID
     * @param packageType - Package type (2X_VISIBILITY, 3X_VISIBILITY, 4X_VISIBILITY)
     * @param productIds - Product IDs to promote
     * @param startDate - Promotion start date
     * @param endDate - Promotion end date
     * @param paymentMethod - Payment method (COINS or RUPEES)
     * @returns Created promotion record
     */
    async purchaseRoomPromotionPackage(
        vendorId: string,
        packageType: '2X_VISIBILITY' | '3X_VISIBILITY' | '4X_VISIBILITY',
        productIds: string[],
        startDate: Date,
        endDate: Date,
        paymentMethod: 'COINS' | 'RUPEES',
    ) {
        this.logger.log(`Vendor ${vendorId} purchasing ${packageType} package`);

        // Validate package type
        if (!this.packagePricing[packageType]) {
            throw new BadRequestException(`Invalid package type: ${packageType}`);
        }

        // Validate products belong to vendor
        const products = await this.prisma.product.findMany({
            where: {
                id: { in: productIds },
                vendorId,
            },
        });

        if (products.length !== productIds.length) {
            throw new BadRequestException('Some products do not belong to this vendor');
        }

        // Validate date range
        if (startDate >= endDate) {
            throw new BadRequestException('Start date must be before end date');
        }

        if (startDate < new Date()) {
            throw new BadRequestException('Start date cannot be in the past');
        }

        const costInPaise = this.packagePricing[packageType];
        // Convert ₹ cost to coins using admin-configured valuation (paise per 1 coin)
        const paisePerCoin = await this.coinValuation.getActivePaisePerCoin(UserRole.VENDOR);
        const costInCoins = Math.ceil(costInPaise / paisePerCoin);

        return await this.prisma.$transaction(async (tx) => {
            // 1. Verify vendor exists
            const vendor = await tx.vendor.findUnique({
                where: { id: vendorId },
                select: { coinsBalance: true, name: true },
            });

            if (!vendor) {
                throw new NotFoundException('Vendor not found');
            }

            // 2. Handle payment
            let paymentStatus = 'PENDING';

            if (paymentMethod === 'COINS') {
                // Pay with coins
                if (vendor.coinsBalance < costInCoins) {
                    throw new BadRequestException(
                        `Insufficient coins balance. Required: ${costInCoins}, Available: ${vendor.coinsBalance}`
                    );
                }

                // Atomic coin deduction
                const coinDeductionResult = await tx.vendor.updateMany({
                    where: {
                        id: vendorId,
                        coinsBalance: { gte: costInCoins },
                    },
                    data: {
                        coinsBalance: { decrement: costInCoins },
                    },
                });

                if (coinDeductionResult.count === 0) {
                    throw new BadRequestException('Insufficient coins (concurrent update detected)');
                }

                paymentStatus = 'COMPLETED';
            } else if (paymentMethod === 'RUPEES') {
                // Pay with ₹ (via payment gateway)
                paymentStatus = 'PENDING';
                this.logger.log(`Payment pending for ${packageType} package, amount: ₹${costInPaise / 100}`);
            } else {
                throw new BadRequestException('Invalid payment method. Use COINS or RUPEES');
            }

            // 3. Create promotion record
            const promotion = await tx.vendorPromotion.create({
                data: {
                    vendorId,
                    type: PromotionType.ROOM_PACKAGE,
                    packageType,
                    productIds,
                    startDate,
                    endDate,
                    coinsCost: paymentMethod === 'COINS' ? costInCoins : 0,
                    moneyCost: paymentMethod === 'RUPEES' ? costInPaise : null,
                    status: paymentStatus === 'COMPLETED' ? PromotionStatus.ACTIVE : PromotionStatus.PAUSED,
                    metadata: paymentMethod === 'RUPEES' ? { paymentStatus: 'PENDING' } : { paymentStatus: 'COMPLETED' },
                },
            });

            // 4. Create RoomPackage record for tracking
            await tx.roomPackage.create({
                data: {
                    vendorId,
                    packageType,
                    remainingCredits: this.getVisibilityMultiplier(packageType),
                },
            });

            // If RUPEES, create a payment intent and attach for client.
            if (paymentMethod === 'RUPEES') {
                const payment = await this.paymentsService.createPaymentIntent({
                    userId: vendorId,
                    purpose: PaymentIntentPurpose.ROOM_PROMOTION,
                    referenceId: promotion.id,
                    amount: costInPaise,
                    currency: 'INR',
                    metadata: {
                        vendorId,
                        promotionId: promotion.id,
                        packageType,
                        productIds,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString(),
                    },
                });

                await tx.vendorPromotion.update({
                    where: { id: promotion.id },
                    data: {
                        metadata: {
                            ...(promotion as any).metadata,
                            paymentIntentId: payment.intentId,
                            providerOrderId: payment.orderId,
                        } as any,
                    },
                });

                this.logger.log(`Room promotion package purchased: ${promotion.id}, type: ${packageType} (RUPEES pending)`);
                return { ...promotion, payment } as any;
            }

            this.logger.log(`Room promotion package purchased: ${promotion.id}, type: ${packageType}`);
            return promotion;
        });
    }

    /**
     * Get available room promotion packages with pricing
     */
    async getAvailablePackages() {
        // Coins value is admin-controlled; compute coins from current paise-per-coin valuation.
        const paisePerCoin = await this.coinValuation.getActivePaisePerCoin(UserRole.VENDOR);
        const coins = (paise: number) => Math.ceil(paise / paisePerCoin);

        return [
            {
                type: '2X_VISIBILITY',
                name: '2x Visibility Package',
                priceInRupees: this.packagePricing['2X_VISIBILITY'] / 100,
                priceInCoins: coins(this.packagePricing['2X_VISIBILITY']),
                description: 'Double your product visibility in rooms',
                multiplier: 2,
            },
            {
                type: '3X_VISIBILITY',
                name: '3x Visibility Package',
                priceInRupees: this.packagePricing['3X_VISIBILITY'] / 100,
                priceInCoins: coins(this.packagePricing['3X_VISIBILITY']),
                description: 'Triple your product visibility in rooms',
                multiplier: 3,
            },
            {
                type: '4X_VISIBILITY',
                name: '4x Visibility Package',
                priceInRupees: this.packagePricing['4X_VISIBILITY'] / 100,
                priceInCoins: coins(this.packagePricing['4X_VISIBILITY']),
                description: 'Quadruple your product visibility in rooms',
                multiplier: 4,
            },
        ];
    }

    /**
     * Get vendor's active room promotions
     */
    async getVendorPromotions(vendorId: string) {
        return await this.prisma.vendorPromotion.findMany({
            where: {
                vendorId,
                type: PromotionType.ROOM_PACKAGE,
                status: { in: [PromotionStatus.ACTIVE, PromotionStatus.PAUSED] },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get promotion performance analytics
     */
    async getPromotionAnalytics(promotionId: string) {
        const promotion = await this.prisma.vendorPromotion.findUnique({
            where: { id: promotionId },
        });

        if (!promotion) {
            throw new NotFoundException('Promotion not found');
        }

        const costInPaise = promotion.moneyCost || (promotion.coinsCost * 100);
        const revenue = promotion.revenue;
        const roi = costInPaise > 0 ? ((revenue - costInPaise) / costInPaise) * 100 : 0;

        return {
            promotionId: promotion.id,
            packageType: promotion.packageType,
            impressions: promotion.impressions,
            clicks: promotion.clicks,
            orders: promotion.orders,
            revenue: promotion.revenue,
            cost: costInPaise,
            roi,
            ctr: promotion.impressions > 0 ? (promotion.clicks / promotion.impressions) * 100 : 0,
            conversionRate: promotion.clicks > 0 ? (promotion.orders / promotion.clicks) * 100 : 0,
        };
    }

    /**
     * Track promotion event (impression, click, order)
     */
    async trackPromotionEvent(
        promotionId: string,
        eventType: 'IMPRESSION' | 'CLICK' | 'ORDER',
        revenue?: number,
    ) {
        const updateData: any = {};

        if (eventType === 'IMPRESSION') {
            updateData.impressions = { increment: 1 };
        } else if (eventType === 'CLICK') {
            updateData.clicks = { increment: 1 };
        } else if (eventType === 'ORDER') {
            updateData.orders = { increment: 1 };
            if (revenue) {
                updateData.revenue = { increment: revenue };
            }
        }

        await this.prisma.vendorPromotion.update({
            where: { id: promotionId },
            data: updateData,
        });
    }

    /**
     * Get visibility multiplier for a package type
     */
    private getVisibilityMultiplier(packageType: string): number {
        const multipliers: Record<string, number> = {
            '2X_VISIBILITY': 2,
            '3X_VISIBILITY': 3,
            '4X_VISIBILITY': 4,
        };
        return multipliers[packageType] || 1;
    }
}
