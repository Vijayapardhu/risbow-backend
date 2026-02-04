import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipTier, PayoutCycle, PaymentIntentPurpose, UserRole } from '@prisma/client';
import {
    SubscribeMembershipDto,
    UpgradeMembershipDto,
    MembershipTierResponseDto,
    CurrentMembershipResponseDto,
} from './dto/membership.dto';
import { PaymentsService } from '../payments/payments.service';
import { CoinValuationService } from '../coins/coin-valuation.service';

@Injectable()
export class VendorMembershipsService {
    private readonly logger = new Logger(VendorMembershipsService.name);

    constructor(
        private prisma: PrismaService,
        private paymentsService: PaymentsService,
        private coinValuation: CoinValuationService,
    ) { }

    // Tier configurations
    private readonly TIER_CONFIGS: Record<MembershipTier, MembershipTierResponseDto> = {
        FREE: {
            tier: 'FREE' as MembershipTier,
            price: 0,
            skuLimit: 10,
            imageLimit: 3,
            commissionRate: 0.15,
            payoutCycle: 'MONTHLY' as PayoutCycle,
            features: {
                prioritySupport: false,
                analytics: false,
                bulkUpload: false,
                promotions: false,
                dedicatedManager: false,
            },
        },
        BASIC: {
            tier: 'BASIC' as MembershipTier,
            price: 999,
            skuLimit: 100,
            imageLimit: 5,
            commissionRate: 0.12,
            payoutCycle: 'WEEKLY' as PayoutCycle,
            features: {
                prioritySupport: false,
                analytics: true,
                bulkUpload: true,
                promotions: true,
                dedicatedManager: false,
            },
        },
        PRO: {
            tier: 'PRO' as MembershipTier,
            price: 2999,
            skuLimit: 1000,
            imageLimit: 10,
            commissionRate: 0.10,
            payoutCycle: 'WEEKLY' as PayoutCycle,
            features: {
                prioritySupport: true,
                analytics: true,
                bulkUpload: true,
                promotions: true,
                dedicatedManager: false,
            },
        },
        PREMIUM: {
            tier: 'PREMIUM' as MembershipTier,
            price: 4999,
            skuLimit: 999999,
            imageLimit: 15,
            commissionRate: 0.08,
            payoutCycle: 'BIWEEKLY' as PayoutCycle,
            features: {
                prioritySupport: true,
                analytics: true,
                bulkUpload: true,
                promotions: true,
                dedicatedManager: false,
            },
        },
        ELITE: {
            tier: 'ELITE' as MembershipTier,
            price: 9999,
            skuLimit: 999999,
            imageLimit: 20,
            commissionRate: 0.05,
            payoutCycle: 'INSTANT' as PayoutCycle,
            features: {
                prioritySupport: true,
                analytics: true,
                bulkUpload: true,
                promotions: true,
                dedicatedManager: true,
            },
        },
    };

    async getAllTiers(): Promise<MembershipTierResponseDto[]> {
        return Object.values(this.TIER_CONFIGS);
    }

    async subscribe(vendorId: string, dto: SubscribeMembershipDto): Promise<CurrentMembershipResponseDto> {
        // Check if vendor exists
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { VendorMembership: true },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Check if already has membership
        if (vendor.VendorMembership) {
            throw new BadRequestException('Vendor already has an active membership. Use upgrade instead.');
        }

        const tierConfig = this.TIER_CONFIGS[dto.tier];

        // Handle payment
        if (dto.paymentMethod === 'COINS') {
            // tierConfig.price is treated as ₹ (rupees). Convert to coins using current valuation.
            const paisePerCoin = await this.coinValuation.getActivePaisePerCoin(UserRole.VENDOR);
            const costInCoins = Math.ceil((tierConfig.price * 100) / paisePerCoin);

            if (vendor.coinsBalance < costInCoins) {
                throw new BadRequestException('Insufficient coins balance');
            }
            // Atomic coin deduction
            const coinDeductionResult = await this.prisma.vendor.updateMany({
                where: {
                    id: vendorId,
                    coinsBalance: { gte: costInCoins },
                },
                data: { coinsBalance: { decrement: costInCoins } },
            });

            if (coinDeductionResult.count === 0) {
                throw new BadRequestException('Insufficient coins (concurrent update detected)');
            }
        } else if (dto.paymentMethod === 'RUPEES') {
            // Pay with ₹ (via payment gateway)
            const payment = await this.paymentsService.createPaymentIntent({
                userId: vendorId,
                purpose: PaymentIntentPurpose.VENDOR_MEMBERSHIP,
                referenceId: `subscribe:${vendorId}:${dto.tier}`,
                amount: tierConfig.price * 100, // ₹ -> paise
                currency: 'INR',
                metadata: { vendorId, tier: dto.tier, autoRenew: dto.autoRenew ?? false, kind: 'SUBSCRIBE' },
            });

            // Return pending response; webhook will mark intent SUCCESS and a follow-up handler can activate membership.
            return {
                id: 'PENDING_PAYMENT',
                tier: dto.tier,
                price: tierConfig.price,
                skuLimit: tierConfig.skuLimit,
                imageLimit: tierConfig.imageLimit,
                commissionRate: tierConfig.commissionRate,
                payoutCycle: tierConfig.payoutCycle,
                isActive: false,
                autoRenew: dto.autoRenew ?? false,
                startDate: new Date(),
                endDate: null,
                usage: { currentSkus: 0, remainingSkus: tierConfig.skuLimit, usagePercentage: 0 },
                payment: payment as any,
            } as any;
        } else {
            throw new BadRequestException('Invalid payment method. Use COINS or RUPEES');
        }

        // Create membership
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

        const membership = await this.prisma.vendorMembership.create({
            data: {
                id: randomUUID(),
                vendorId,
                tier: dto.tier,
                price: tierConfig.price,
                skuLimit: tierConfig.skuLimit,
                imageLimit: tierConfig.imageLimit,
                commissionRate: tierConfig.commissionRate,
                payoutCycle: tierConfig.payoutCycle,
                features: tierConfig.features,
                endDate,
                autoRenew: dto.autoRenew ?? false,
                isActive: true,
                updatedAt: new Date(),
            },
        });

        // Update vendor tier and limits
        await this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                tier: dto.tier,
                skuLimit: tierConfig.skuLimit,
                commissionRate: tierConfig.commissionRate,
            },
        });

        return this.getCurrentMembership(vendorId);
    }

    async upgrade(vendorId: string, dto: UpgradeMembershipDto): Promise<CurrentMembershipResponseDto> {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { VendorMembership: true, Product: true },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        if (!vendor.VendorMembership) {
            throw new BadRequestException('No active membership found. Please subscribe first.');
        }

        const currentTier = vendor.VendorMembership.tier;
        const newTier = dto.newTier;

        // Validate upgrade (can't downgrade)
        const tierOrder = ['FREE', 'BASIC', 'PRO', 'PREMIUM', 'ELITE'];
        if (tierOrder.indexOf(newTier) <= tierOrder.indexOf(currentTier)) {
            throw new BadRequestException('Can only upgrade to a higher tier');
        }

        const newTierConfig = this.TIER_CONFIGS[newTier];

        // Calculate prorated cost
        const daysRemaining = Math.ceil(
            (vendor.VendorMembership.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        );
        const proratedCost = Math.ceil((newTierConfig.price * daysRemaining) / 30);

        // Handle payment for upgrade
        if (dto.paymentMethod === 'COINS') {
            const paisePerCoin = await this.coinValuation.getActivePaisePerCoin(UserRole.VENDOR);
            const upgradeCostInCoins = Math.ceil((proratedCost * 100) / paisePerCoin);

            if (vendor.coinsBalance < upgradeCostInCoins) {
                throw new BadRequestException('Insufficient coins balance for upgrade');
            }
            // Atomic coin deduction
            const coinDeductionResult = await this.prisma.vendor.updateMany({
                where: {
                    id: vendorId,
                    coinsBalance: { gte: upgradeCostInCoins },
                },
                data: { coinsBalance: { decrement: upgradeCostInCoins } },
            });

            if (coinDeductionResult.count === 0) {
                throw new BadRequestException('Insufficient coins (concurrent update detected)');
            }
        } else if (dto.paymentMethod === 'RUPEES') {
            const payment = await this.paymentsService.createPaymentIntent({
                userId: vendorId,
                purpose: PaymentIntentPurpose.VENDOR_MEMBERSHIP,
                referenceId: `upgrade:${vendorId}:${newTier}`,
                amount: proratedCost * 100, // ₹ -> paise
                currency: 'INR',
                metadata: { vendorId, newTier, proratedCost, kind: 'UPGRADE' },
            });

            return {
                id: 'PENDING_PAYMENT',
                tier: newTier,
                price: newTierConfig.price,
                skuLimit: newTierConfig.skuLimit,
                imageLimit: newTierConfig.imageLimit,
                commissionRate: newTierConfig.commissionRate,
                payoutCycle: newTierConfig.payoutCycle,
                isActive: false,
                autoRenew: vendor.VendorMembership.autoRenew,
                startDate: vendor.VendorMembership.startDate,
                endDate: vendor.VendorMembership.endDate,
                usage: { currentSkus: vendor.Product.length, remainingSkus: Math.max(0, newTierConfig.skuLimit - vendor.Product.length), usagePercentage: 0 },
                payment: payment as any,
            } as any;
        }

        // Update membership
        await this.prisma.vendorMembership.update({
            where: { id: vendor.VendorMembership.id },
            data: {
                tier: newTier,
                price: newTierConfig.price,
                skuLimit: newTierConfig.skuLimit,
                imageLimit: newTierConfig.imageLimit,
                commissionRate: newTierConfig.commissionRate,
                payoutCycle: newTierConfig.payoutCycle,
                features: newTierConfig.features,
            },
        });

        // Update vendor
        await this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                tier: newTier,
                skuLimit: newTierConfig.skuLimit,
                commissionRate: newTierConfig.commissionRate,
            },
        });

        return this.getCurrentMembership(vendorId);
    }

    async getCurrentMembership(vendorId: string): Promise<CurrentMembershipResponseDto> {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: {
                VendorMembership: true,
                Product: {
                    where: { isActive: true },
                    select: { id: true },
                },
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        if (!vendor.VendorMembership) {
            throw new NotFoundException('No active membership found');
        }

        const currentSkus = vendor.Product.length;
        const remainingSkus = vendor.VendorMembership.skuLimit - currentSkus;
        const usagePercentage = Math.round((currentSkus / vendor.VendorMembership.skuLimit) * 100);

        return {
            id: vendor.VendorMembership.id,
            tier: vendor.VendorMembership.tier,
            price: vendor.VendorMembership.price,
            skuLimit: vendor.VendorMembership.skuLimit,
            imageLimit: vendor.VendorMembership.imageLimit,
            commissionRate: vendor.VendorMembership.commissionRate,
            payoutCycle: vendor.VendorMembership.payoutCycle,
            isActive: vendor.VendorMembership.isActive,
            autoRenew: vendor.VendorMembership.autoRenew,
            startDate: vendor.VendorMembership.startDate,
            endDate: vendor.VendorMembership.endDate,
            usage: {
                currentSkus,
                remainingSkus,
                usagePercentage,
            },
        };
    }

    async cancelAutoRenewal(vendorId: string): Promise<{ message: string; endDate: Date }> {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { VendorMembership: true },
        });

        if (!vendor || !vendor.VendorMembership) {
            throw new NotFoundException('No active membership found');
        }

        await this.prisma.vendorMembership.update({
            where: { id: vendor.VendorMembership.id },
            data: { autoRenew: false },
        });

        return {
            message: 'Auto-renewal cancelled successfully',
            endDate: vendor.VendorMembership.endDate,
        };
    }

    /**
     * Get membership comparison for all tiers
     */
    async getMembershipComparison(): Promise<MembershipTierResponseDto[]> {
        return this.getAllTiers();
    }

    /**
     * Check and notify vendors about expiring memberships
     * Should be called by a cron job
     */
    async checkExpiringMemberships(): Promise<number> {
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        // Find memberships expiring in 7 days
        const expiringSoon = await this.prisma.vendorMembership.findMany({
            where: {
                isActive: true,
                endDate: {
                    gte: threeDaysFromNow,
                    lte: sevenDaysFromNow,
                },
                autoRenew: false, // Only notify if not auto-renewing
            },
            include: {
                Vendor: {
                    select: { id: true, name: true, email: true, mobile: true },
                },
            },
        });

        let notifiedCount = 0;

        for (const membership of expiringSoon) {
            this.logger.log(
                `Membership expiring soon for vendor ${membership.vendorId} (${membership.tier}) - expires on ${membership.endDate}`
            );
            notifiedCount++;
        }

        // Find memberships expiring in 3 days (urgent)
        const expiringUrgent = await this.prisma.vendorMembership.findMany({
            where: {
                isActive: true,
                endDate: {
                    gte: now,
                    lte: threeDaysFromNow,
                },
                autoRenew: false,
            },
            include: {
                Vendor: {
                    select: { id: true, name: true, email: true, mobile: true },
                },
            },
        });

        for (const membership of expiringUrgent) {
            this.logger.warn(
                `URGENT: Membership expiring in 3 days for vendor ${membership.vendorId} (${membership.tier})`
            );
            notifiedCount++;
        }

        return notifiedCount;
    }

    /**
     * Process membership renewals (for auto-renew enabled memberships)
     * Should be called by a cron job
     */
    async processAutoRenewals(): Promise<number> {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find memberships expiring tomorrow with auto-renew enabled
        const toRenew = await this.prisma.vendorMembership.findMany({
            where: {
                isActive: true,
                autoRenew: true,
                endDate: {
                    gte: now,
                    lte: tomorrow,
                },
            },
            include: {
                Vendor: {
                    select: { id: true, coinsBalance: true },
                },
            },
        });

        let renewedCount = 0;

        for (const membership of toRenew) {
            try {
                // Try to renew with coins first, then fallback to payment gateway
                const tierConfig = this.TIER_CONFIGS[membership.tier];

                const paisePerCoin = await this.coinValuation.getActivePaisePerCoin(UserRole.VENDOR);
                const renewalCostInCoins = Math.ceil((tierConfig.price * 100) / paisePerCoin);

                if (membership.Vendor.coinsBalance >= renewalCostInCoins) {
                    // Renew with coins
                    await this.prisma.$transaction(async (tx) => {
                        await tx.vendor.updateMany({
                            where: {
                                id: membership.vendorId,
                                coinsBalance: { gte: renewalCostInCoins },
                            },
                            data: { coinsBalance: { decrement: renewalCostInCoins } },
                        });

                        const newEndDate = new Date();
                        newEndDate.setMonth(newEndDate.getMonth() + 1);

                        await tx.vendorMembership.update({
                            where: { id: membership.id },
                            data: {
                                startDate: new Date(),
                                endDate: newEndDate,
                            },
                        });
                    });

                    renewedCount++;
                    this.logger.log(`Auto-renewed membership for vendor ${membership.vendorId} with coins`);
                } else {
                    await this.paymentsService.createPaymentIntent({
                        userId: membership.vendorId,
                        purpose: PaymentIntentPurpose.VENDOR_MEMBERSHIP,
                        referenceId: `renew:${membership.vendorId}:${membership.tier}`,
                        amount: tierConfig.price * 100,
                        currency: 'INR',
                        metadata: { vendorId: membership.vendorId, tier: membership.tier, kind: 'RENEW' },
                    }).catch(() => {});
                    this.logger.warn(
                        `Cannot auto-renew membership for vendor ${membership.vendorId} - insufficient coins, payment gateway renewal needed`
                    );
                }
            } catch (error) {
                this.logger.error(`Failed to auto-renew membership ${membership.id}: ${error.message}`);
            }
        }

        return renewedCount;
    }
}
