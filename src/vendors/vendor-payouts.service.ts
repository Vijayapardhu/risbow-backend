import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionService } from '../common/commission.service';
import { PayoutStatus } from '@prisma/client';
import {
    RequestPayoutDto,
    UpdateBankDetailsDto,
    PayoutHistoryQueryDto,
    PayoutBalanceResponseDto,
    PayoutSummaryResponseDto,
} from './dto/vendor-payout.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class VendorPayoutsService {
    private readonly MINIMUM_PAYOUT_AMOUNT = 10000; // ₹100 in paise

    constructor(
        private prisma: PrismaService,
        private commissionService: CommissionService,
    ) {}

    async getBalance(vendorId: string): Promise<PayoutBalanceResponseDto> {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                pendingEarnings: true,
                lastPayoutDate: true,
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Calculate total paid out from completed payouts
        const totalPaidOutResult = await this.prisma.vendorPayout.aggregate({
            where: {
                vendorId,
                status: PayoutStatus.COMPLETED,
            },
            _sum: {
                amount: true,
            },
        });

        const pendingEarnings = vendor.pendingEarnings;
        const availableBalance = pendingEarnings;

        const commissionRate = await this.commissionService.resolveCommissionRate({ vendorId });

        return {
            pendingEarnings,
            availableBalance,
            totalPaidOut: totalPaidOutResult._sum.amount ?? 0,
            lastPayoutDate: vendor.lastPayoutDate,
            commissionRate,
        };
    }

    async getPayoutHistory(vendorId: string, query: PayoutHistoryQueryDto) {
        const { page = 1, limit = 10, status, startDate, endDate } = query;
        const skip = (page - 1) * limit;

        const where: any = { vendorId };

        if (status) {
            where.status = status;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }

        const [payouts, total] = await Promise.all([
            this.prisma.vendorPayout.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.vendorPayout.count({ where }),
        ]);

        return {
            data: payouts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getPayoutById(vendorId: string, payoutId: string) {
        const payout = await this.prisma.vendorPayout.findFirst({
            where: {
                id: payoutId,
                vendorId,
            },
        });

        if (!payout) {
            throw new NotFoundException('Payout not found');
        }

        return payout;
    }

    async requestPayout(vendorId: string, dto: RequestPayoutDto) {
        const { amount } = dto;

        // Validate minimum amount
        if (amount < this.MINIMUM_PAYOUT_AMOUNT) {
            throw new BadRequestException(
                `Minimum payout amount is ₹${this.MINIMUM_PAYOUT_AMOUNT / 100}`,
            );
        }

        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                pendingEarnings: true,
                bankDetails: true,
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Validate bank details exist
        if (!vendor.bankDetails) {
            throw new BadRequestException(
                'Please add bank details before requesting a payout',
            );
        }

        const bankDetails = vendor.bankDetails as Record<string, any>;
        if (
            !bankDetails.accountNumber ||
            !bankDetails.ifscCode ||
            !bankDetails.accountHolderName
        ) {
            throw new BadRequestException(
                'Incomplete bank details. Please update your bank details',
            );
        }

        // Calculate available balance (pendingEarnings already net of commission)
        const availableBalance = vendor.pendingEarnings;

        if (amount > availableBalance) {
            throw new BadRequestException(
                `Requested amount exceeds available balance of ₹${availableBalance / 100}`,
            );
        }

        // Create payout and deduct from pending earnings in a transaction
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

        const payout = await this.prisma.$transaction(async (tx) => {
            // Create the payout record
            const newPayout = await tx.vendorPayout.create({
                data: {
                    id: randomUUID(),
                    Vendor: { connect: { id: vendorId } },
                    amount,
                    period: currentMonth,
                    status: PayoutStatus.PENDING,
                    bankDetails: vendor.bankDetails as object,
                    updatedAt: new Date(),
                },
            });

            // Deduct from pending earnings (already net of commission)
            const actualDeduction = Math.min(
                amount,
                vendor.pendingEarnings,
            );

            await tx.vendor.update({
                where: { id: vendorId },
                data: {
                    pendingEarnings: {
                        decrement: actualDeduction,
                    },
                },
            });

            return newPayout;
        });

        return {
            message: 'Payout request submitted successfully',
            payout,
        };
    }

    async updateBankDetails(vendorId: string, dto: UpdateBankDetailsDto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        const updatedVendor = await this.prisma.vendor.update({
            where: { id: vendorId },
            data: {
                bankDetails: {
                    accountNumber: dto.accountNumber,
                    ifscCode: dto.ifscCode,
                    accountHolderName: dto.accountHolderName,
                    bankName: dto.bankName,
                },
            },
            select: {
                id: true,
                bankDetails: true,
            },
        });

        return {
            message: 'Bank details updated successfully',
            bankDetails: updatedVendor.bankDetails,
        };
    }

    async getPayoutSummary(vendorId: string): Promise<PayoutSummaryResponseDto> {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                pendingEarnings: true,
                lastPayoutDate: true,
            },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        // Get aggregates from payouts
        const [completedStats, pendingStats, lastPayout] = await Promise.all([
            this.prisma.vendorPayout.aggregate({
                where: {
                    vendorId,
                    status: PayoutStatus.COMPLETED,
                },
                _sum: { amount: true },
            }),
            this.prisma.vendorPayout.aggregate({
                where: {
                    vendorId,
                    status: PayoutStatus.PENDING,
                },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.vendorPayout.findFirst({
                where: {
                    vendorId,
                    status: PayoutStatus.COMPLETED,
                },
                orderBy: { processedAt: 'desc' },
                select: {
                    amount: true,
                    processedAt: true,
                },
            }),
        ]);

        const totalPaidOut = completedStats._sum.amount ?? 0;
        // Total earned = what's been paid out + what's still pending
        const totalEarned = totalPaidOut + vendor.pendingEarnings;

        return {
            totalEarned,
            totalPaidOut,
            pendingPayoutsCount: pendingStats._count ?? 0,
            pendingPayoutsAmount: pendingStats._sum.amount ?? 0,
            lastPayoutDate: lastPayout?.processedAt ?? vendor.lastPayoutDate,
            lastPayoutAmount: lastPayout?.amount ?? null,
        };
    }
}
