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
}
