import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipTier, PayoutCycle } from '@prisma/client';
import {
    SubscribeMembershipDto,
    UpgradeMembershipDto,
    MembershipTierResponseDto,
    CurrentMembershipResponseDto,
} from './dto/membership.dto';

@Injectable()
export class VendorMembershipsService {
    constructor(private prisma: PrismaService) { }

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
            if (vendor.coinsBalance < tierConfig.price) {
                throw new BadRequestException('Insufficient coins balance');
            }
            // Deduct coins
            await this.prisma.vendor.update({
                where: { id: vendorId },
                data: { coinsBalance: { decrement: tierConfig.price } },
            });
        } else {
            // TODO: Integrate with Razorpay for money payment
            // For now, assume payment is successful
        }

        // Create membership
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

        const membership = await this.prisma.vendorMembership.create({
            data: {
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
            include: { VendorMembership: true, products: true },
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

        // TODO: Process payment for prorated cost

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
                products: {
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

        const currentSkus = vendor.products.length;
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
}
