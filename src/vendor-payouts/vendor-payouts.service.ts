import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit.service';
import { PayoutStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

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
                email: true,
                pendingEarnings: true,
                lastPayoutDate: true,
                VendorMembership: {
                    select: {
                        payoutCycle: true
                    }
                }
            }
        });

        if (vendors.length === 0) {
            return [];
        }

        const vendorIds = vendors.map(v => v.id);
        const settlementCounts = await this.prisma.orderSettlement.groupBy({
            by: ['vendorId', 'status'],
            where: { vendorId: { in: vendorIds } },
            _count: true
        });

        const statsMap = new Map<string, { totalOrders: number; completedOrders: number }>();
        for (const vendorId of vendorIds) {
            statsMap.set(vendorId, { totalOrders: 0, completedOrders: 0 });
        }

        for (const row of settlementCounts) {
            const current = statsMap.get(row.vendorId) || { totalOrders: 0, completedOrders: 0 };
            current.totalOrders += row._count;
            if (row.status === 'SETTLED' || row.status === 'ELIGIBLE') {
                current.completedOrders += row._count;
            }
            statsMap.set(row.vendorId, current);
        }

        return vendors.map(v => ({
            vendorId: v.id,
            vendorName: v.name,
            vendorEmail: v.email || '',
            pendingAmount: v.pendingEarnings,
            lastPayout: v.lastPayoutDate,
            totalOrders: statsMap.get(v.id)?.totalOrders || 0,
            completedOrders: statsMap.get(v.id)?.completedOrders || 0
        }));
    }

    async getAdminPayoutHistory(query: { page?: number; limit?: number; status?: PayoutStatus | string }) {
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query.status && query.status !== 'ALL') {
            where.status = query.status;
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [payouts, total, processedThisMonth] = await Promise.all([
            this.prisma.vendorPayout.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    Vendor: { select: { name: true, email: true } }
                }
            }),
            this.prisma.vendorPayout.count({ where }),
            this.prisma.vendorPayout.count({
                where: {
                    status: PayoutStatus.COMPLETED,
                    processedAt: { gte: startOfMonth }
                }
            })
        ]);

        return {
            data: payouts.map(payout => ({
                id: payout.id,
                vendorId: payout.vendorId,
                vendorName: payout.Vendor?.name || 'Vendor',
                vendorEmail: payout.Vendor?.email || '',
                amount: payout.amount,
                status: payout.status,
                transactionId: payout.transactionId,
                bankDetails: payout.bankDetails,
                processedAt: payout.processedAt,
                createdAt: payout.createdAt
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                processedThisMonth
            }
        };
    }

    async processPayout(adminId: string, vendorId: string, amount: number, transactionId: string) {
        return this.prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) throw new NotFoundException('Vendor not found');

            if (vendor.pendingEarnings < amount) {
                throw new BadRequestException(`Insufficient pending earnings. Current: ${vendor.pendingEarnings}`);
            }

            // 1. Create Payout Record
            const payout = await tx.vendorPayout.create({
                data: {
                    id: randomUUID(),
                    vendorId,
                    amount,
                    period: new Date().toISOString().slice(0, 7), // YYYY-MM
                    status: PayoutStatus.COMPLETED,
                    bankDetails: vendor.bankDetails as any || {},
                    transactionId,
                    processedAt: new Date(),
                    updatedAt: new Date()
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
        const availableBalance = vendor.pendingEarnings;

        return {
            pendingEarnings: vendor.pendingEarnings,
            availableBalance,
            totalEarnings: vendor.pendingEarnings + totalPaidOut,
            totalPaidOut,
            lastPayoutDate: vendor.lastPayoutDate,
            payoutCycle: vendor.VendorMembership?.payoutCycle || 'MONTHLY',
            commissionRate: 0
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

    async requestPayout(vendorId: string, amount: number) {
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
                id: randomUUID(),
                vendorId,
                amount,
                period: new Date().toISOString().slice(0, 7), // YYYY-MM
                status: PayoutStatus.PENDING,
                bankDetails: vendor.bankDetails as any,
                updatedAt: new Date()
            }
        });

        return payout;
    }
}
