import { Injectable, Logger } from '@nestjs/common';
import { CommissionScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionService {
    private readonly logger = new Logger(CommissionService.name);
    // Basis points: 15% => 1500 (10000 bp = 100%)
    private readonly PLATFORM_DEFAULT_RATE_BP = 1500;

    constructor(private prisma: PrismaService) { }

    /**
     * Calculate commission amount based on priority logic:
     * 1. Product rule
     * 2. Vendor rule
     * 3. Category rule
     * 4. Global rule
     * 5. Vendor override (legacy)
     * 6. Category commission (legacy)
     * 7. Platform default rate (15%)
     *
     * @param price - Price in paise (1 INR = 100 paise)
     * @param categoryId - Category ID
     * @param vendorId - Vendor ID
     * @param productId - Product ID (optional)
     * @returns Commission amount in paise
     */
    async calculateCommission(
        price: number,
        categoryId: string,
        vendorId: string,
        productId?: string,
    ): Promise<number> {
        // Commission resolution must NOT silently fallback on error.
        // A failed commission lookup means we cannot guarantee correct vendor earnings.
        // Throwing here forces the caller to handle the error explicitly.
        const commissionRateBp = await this.resolveCommissionRate({
            categoryId,
            vendorId,
            productId,
        });

        const commissionInPaise = Math.round((price * commissionRateBp) / 10000);
        this.logger.debug(
            `Commission calculated: ${price} paise * ${commissionRateBp}bp = ${commissionInPaise} paise`
        );
        return commissionInPaise;
    }

    async resolveCommissionRate(args: {
        categoryId?: string;
        vendorId?: string;
        productId?: string;
        when?: Date;
    }): Promise<number> {
        const now = args.when || new Date();
        const { vendorId, categoryId, productId } = args;

        const ruleWhereBase = {
            isActive: true,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        } as any;

        const ruleOrder = [
            { scope: CommissionScope.PRODUCT, productId },
            { scope: CommissionScope.VENDOR, vendorId },
            { scope: CommissionScope.CATEGORY, categoryId },
            { scope: CommissionScope.GLOBAL },
        ];

        for (const entry of ruleOrder) {
            if ('productId' in entry && !entry.productId) continue;
            if ('vendorId' in entry && !entry.vendorId) continue;
            if ('categoryId' in entry && !entry.categoryId) continue;

            const rule = await this.prisma.commissionRule.findFirst({
                where: {
                    ...ruleWhereBase,
                    scope: entry.scope,
                    ...(entry.productId ? { productId: entry.productId } : {}),
                    ...(entry.vendorId ? { vendorId: entry.vendorId } : {}),
                    ...(entry.categoryId ? { categoryId: entry.categoryId } : {}),
                },
                orderBy: { createdAt: 'desc' },
                select: { commissionRate: true },
            });

            if (rule?.commissionRate != null) {
                return rule.commissionRate;
            }
        }

        // Legacy vendor override
        if (vendorId) {
            const vendor = await this.prisma.vendor.findUnique({
                where: { id: vendorId },
                select: { commissionRate: true },
            });
            if (vendor?.commissionRate != null && vendor.commissionRate > 0) {
                return vendor.commissionRate;
            }
        }

        // Legacy category commission
        if (categoryId) {
            const categoryComm = await this.prisma.categoryCommission.findUnique({
                where: { categoryId },
                select: { commissionRate: true, isActive: true },
            });
            if (categoryComm && categoryComm.isActive && categoryComm.commissionRate > 0) {
                return categoryComm.commissionRate;
            }
        }

        return this.PLATFORM_DEFAULT_RATE_BP;
    }

    async getCommissionPreview(args: {
        price: number;
        categoryId?: string;
        vendorId?: string;
        productId?: string;
    }): Promise<{
        commissionRate: number; // basis points
        commissionAmount: number;
        scope: CommissionScope | 'DEFAULT';
        ruleId?: string;
    }> {
        const now = new Date();
        const { price, categoryId, vendorId, productId } = args;

        const ruleWhereBase = {
            isActive: true,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        } as any;

        const ruleOrder = [
            { scope: CommissionScope.PRODUCT, productId },
            { scope: CommissionScope.VENDOR, vendorId },
            { scope: CommissionScope.CATEGORY, categoryId },
            { scope: CommissionScope.GLOBAL },
        ];

        for (const entry of ruleOrder) {
            if ('productId' in entry && !entry.productId) continue;
            if ('vendorId' in entry && !entry.vendorId) continue;
            if ('categoryId' in entry && !entry.categoryId) continue;

            const rule = await this.prisma.commissionRule.findFirst({
                where: {
                    ...ruleWhereBase,
                    scope: entry.scope,
                    ...(entry.productId ? { productId: entry.productId } : {}),
                    ...(entry.vendorId ? { vendorId: entry.vendorId } : {}),
                    ...(entry.categoryId ? { categoryId: entry.categoryId } : {}),
                },
                orderBy: { createdAt: 'desc' },
                select: { id: true, commissionRate: true },
            });

            if (rule?.commissionRate != null) {
                return {
                    commissionRate: rule.commissionRate,
                    commissionAmount: Math.round((price * rule.commissionRate) / 10000),
                    scope: entry.scope,
                    ruleId: rule.id,
                };
            }
        }

        const rate = await this.resolveCommissionRate({ categoryId, vendorId, productId, when: now });
        return {
            commissionRate: rate,
            commissionAmount: Math.round((price * rate) / 10000),
            scope: 'DEFAULT',
        };
    }

    /**
     * Calculate net vendor earnings after commission
     * @param totalPrice - Total price in paise
     * @param commissionAmount - Commission amount in paise
     * @returns Net vendor earnings in paise
     */
    calculateNetVendorEarnings(totalPrice: number, commissionAmount: number): number {
        return totalPrice - commissionAmount;
    }
}
