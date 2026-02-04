import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import { PayoutStatus } from '@prisma/client';

@Injectable()
export class VendorPayoutsService {
    constructor(
        private prisma: PrismaService,
        private audit: AuditLogService
    ) { }

    async getPayoutHistory(vendorId: string) {
        return this.prisma.vendorPayout.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getDuePayouts() {
        // Simple logic: Find vendors with pendingEarnings > 0
        // In real app, check payoutCycle (Monthly vs Weekly) vs lastPayoutDate
        // For now, return all who have earnings.
        const vendors = await this.prisma.vendor.findMany({
            where: {
                pendingEarnings: { gt: 0 },
                kycStatus: 'VERIFIED'
            },
            select: {
                id: true,
                name: true,
                pendingEarnings: true,
                lastPayoutDate: true,
                bankDetails: true,
                VendorMembership: {
                    select: {
                        payoutCycle: true
                    }
                }
            }
        });

        return vendors.map(v => ({
            vendorId: v.id,
            vendorName: v.name,
            amount: v.pendingEarnings,
            lastPayout: v.lastPayoutDate,
            bankDetails: v.bankDetails
        }));
    }

    async processPayout(adminId: string, vendorId: string, amount: number, transactionId: string, notes?: string) {
        return this.prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) throw new NotFoundException('Vendor not found');

            if (vendor.pendingEarnings < amount) {
                throw new BadRequestException(`Insufficient pending earnings. Current: ${vendor.pendingEarnings}`);
            }

            // 1. Create Payout Record
            const payout = await tx.vendorPayout.create({
                data: {
                    vendorId,
                    amount,
                    period: new Date().toISOString().slice(0, 7), // YYYY-MM
                    status: PayoutStatus.COMPLETED,
                    bankDetails: vendor.bankDetails as any || {},
                    transactionId,
                    processedAt: new Date()
                }
            });

            // 2. Debit Vendor Earnings (prevent double processing)
            await tx.vendor.update({
                where: { id: vendorId },
                data: {
                    pendingEarnings: { decrement: amount },
                    lastPayoutDate: new Date()
                }
            });

            // 3. Audit Log
            await this.audit.logAdminAction(adminId, 'PROCESS_PAYOUT', 'VendorPayout', payout.id, {
                vendorId,
                amount,
                transactionId
            });

            return payout;
        });
    }

    async getBalance(vendorId: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                pendingEarnings: true,
                totalEarnings: true,
                lastPayoutDate: true,
                VendorMembership: {
                    select: {
                        payoutCycle: true
                    }
                }
            }
        });

        if (!vendor) throw new NotFoundException('Vendor not found');

        // Calculate total paid out
        const payouts = await this.prisma.vendorPayout.findMany({
            where: {
                vendorId,
                status: PayoutStatus.COMPLETED
            },
            select: {
                amount: true
            }
        });

        const totalPaidOut = payouts.reduce((sum, p) => sum + p.amount, 0);

        return {
            availableBalance: vendor.pendingEarnings,
            totalEarnings: vendor.totalEarnings,
            totalPaidOut,
            lastPayoutDate: vendor.lastPayoutDate,
            payoutCycle: vendor.VendorMembership?.payoutCycle || 'MONTHLY'
        };
    }

    async getPendingPayouts(vendorId: string) {
        return this.prisma.vendorPayout.findMany({
            where: {
                vendorId,
                status: PayoutStatus.PENDING
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async requestPayout(vendorId: string, amount: number, notes?: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                pendingEarnings: true,
                kycStatus: true,
                bankDetails: true
            }
        });

        if (!vendor) throw new NotFoundException('Vendor not found');

        if (vendor.kycStatus !== 'VERIFIED') {
            throw new BadRequestException('KYC verification required to request payouts');
        }

        if (!vendor.bankDetails || Object.keys(vendor.bankDetails as any).length === 0) {
            throw new BadRequestException('Bank details required to request payouts');
        }

        if (amount <= 0) {
            throw new BadRequestException('Amount must be greater than 0');
        }

        if (amount > vendor.pendingEarnings) {
            throw new BadRequestException(
                `Insufficient balance. Available: ${vendor.pendingEarnings}, Requested: ${amount}`
            );
        }

        // Minimum payout threshold (e.g., 500 INR)
        const MIN_PAYOUT = 500;
        if (amount < MIN_PAYOUT) {
            throw new BadRequestException(`Minimum payout amount is ${MIN_PAYOUT}`);
        }

        // Create payout request
        const payout = await this.prisma.vendorPayout.create({
            data: {
                vendorId,
                amount,
                period: new Date().toISOString().slice(0, 7), // YYYY-MM
                status: PayoutStatus.PENDING,
                bankDetails: vendor.bankDetails as any,
                notes
            }
        });

        return payout;
    }
}
