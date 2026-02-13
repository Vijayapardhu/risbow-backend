import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReturnStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class VendorReturnsService {
    private readonly logger = new Logger(VendorReturnsService.name);

    constructor(private prisma: PrismaService) { }

    async findAllForVendor(vendorId: string, query: any) {
        const { page = 1, limit = 10, status, search } = query;
        const skip = (page - 1) * limit;

        const where: any = { vendorId };
        if (status && status !== 'ALL') where.status = status;
        if (search) {
            where.OR = [
                { returnNumber: { contains: search, mode: 'insensitive' } },
                { orderId: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [total, data] = await Promise.all([
            this.prisma.returnRequest.count({ where }),
            this.prisma.returnRequest.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    ReturnItem: { include: { Product: true } },
                    User: { select: { id: true, name: true, email: true, mobile: true } },
                    Order: { select: { id: true, itemsSnapshot: true } },
                },
                orderBy: { requestedAt: 'desc' },
            }),
        ]);

        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getStatsForVendor(vendorId: string) {
        const [pending, approved, rejected, completed] = await Promise.all([
            this.prisma.returnRequest.count({ where: { vendorId, status: ReturnStatus.PENDING_APPROVAL } }),
            this.prisma.returnRequest.count({ where: { vendorId, status: ReturnStatus.APPROVED } }),
            this.prisma.returnRequest.count({ where: { vendorId, status: ReturnStatus.REJECTED } }),
            this.prisma.returnRequest.count({ where: { vendorId, status: ReturnStatus.REFUND_COMPLETED } }),
        ]);

        return {
            pending,
            approved,
            rejected,
            completed,
            total: pending + approved + rejected + completed,
        };
    }

    async findOneForVendor(vendorId: string, returnId: string) {
        const returnReq = await this.prisma.returnRequest.findUnique({
            where: { id: returnId },
            include: {
                ReturnItem: { include: { Product: true } },
                User: true,
                Order: true,
                ReturnTimeline: { orderBy: { timestamp: 'desc' } },
                ReturnSettlement: true,
            },
        });

        if (!returnReq) throw new NotFoundException('Return request not found');
        if (returnReq.vendorId !== vendorId) throw new ForbiddenException('You do not have access to this return request');

        return returnReq;
    }

    async acceptReturn(vendorId: string, returnId: string) {
        const returnReq = await this.prisma.returnRequest.findUnique({ where: { id: returnId } });

        if (!returnReq) throw new NotFoundException('Return request not found');
        if (returnReq.vendorId !== vendorId) throw new ForbiddenException('You do not have access to this return request');
        if (returnReq.status !== ReturnStatus.PENDING_APPROVAL) {
            throw new Error(`Cannot accept return with status ${returnReq.status}`);
        }

        return this.prisma.returnRequest.update({
            where: { id: returnId },
            data: {
                status: ReturnStatus.APPROVED,
                updatedAt: new Date(),
                ReturnTimeline: {
                    create: {
                        id: randomUUID(),
                        status: ReturnStatus.APPROVED,
                        action: 'VENDOR_ACCEPTED',
                        performedBy: 'VENDOR',
                        actorId: vendorId,
                        notes: 'Return request accepted by vendor',
                    },
                },
            },
            include: { ReturnTimeline: true },
        });
    }

    async rejectReturn(vendorId: string, returnId: string, reason: string) {
        const returnReq = await this.prisma.returnRequest.findUnique({ where: { id: returnId } });

        if (!returnReq) throw new NotFoundException('Return request not found');
        if (returnReq.vendorId !== vendorId) throw new ForbiddenException('You do not have access to this return request');
        if (returnReq.status !== ReturnStatus.PENDING_APPROVAL) {
            throw new Error(`Cannot reject return with status ${returnReq.status}`);
        }

        return (this.prisma as any).returnRequest.update({
            where: { id: returnId },
            data: {
                status: ReturnStatus.REJECTED,
                updatedAt: new Date(),
                rejectionReason: reason,
                ReturnTimeline: {
                    create: {
                        id: randomUUID(),
                        status: ReturnStatus.REJECTED,
                        action: 'VENDOR_REJECTED',
                        performedBy: 'VENDOR',
                        actorId: vendorId,
                        notes: `Return rejected by vendor: ${reason}`,
                    },
                },
            },
            include: { ReturnTimeline: true },
        });
    }

    async markReceived(vendorId: string, returnId: string) {
        const returnReq = await this.prisma.returnRequest.findUnique({ where: { id: returnId } });

        if (!returnReq) throw new NotFoundException('Return request not found');
        if (returnReq.vendorId !== vendorId) throw new ForbiddenException('You do not have access to this return request');

        return this.prisma.returnRequest.update({
            where: { id: returnId },
            data: {
                status: ReturnStatus.RECEIVED_AT_WAREHOUSE,
                updatedAt: new Date(),
                ReturnTimeline: {
                    create: {
                        id: randomUUID(),
                        status: ReturnStatus.RECEIVED_AT_WAREHOUSE,
                        action: 'VENDOR_RECEIVED',
                        performedBy: 'VENDOR',
                        actorId: vendorId,
                        notes: 'Return package received by vendor',
                    },
                },
            },
            include: { ReturnTimeline: true },
        });
    }

    async initiateRefund(vendorId: string, returnId: string) {
        const returnReq = await this.prisma.returnRequest.findUnique({ where: { id: returnId } });

        if (!returnReq) throw new NotFoundException('Return request not found');
        if (returnReq.vendorId !== vendorId) throw new ForbiddenException('You do not have access to this return request');

        return this.prisma.returnRequest.update({
            where: { id: returnId },
            data: {
                status: ReturnStatus.REFUND_INITIATED,
                updatedAt: new Date(),
                ReturnTimeline: {
                    create: {
                        id: randomUUID(),
                        status: ReturnStatus.REFUND_INITIATED,
                        action: 'VENDOR_REFUND_INITIATED',
                        performedBy: 'VENDOR',
                        actorId: vendorId,
                        notes: 'Refund initiated by vendor',
                    },
                },
            },
            include: { ReturnTimeline: true },
        });
    }

    async completeReturn(vendorId: string, returnId: string) {
        const returnReq = await this.prisma.returnRequest.findUnique({ where: { id: returnId } });

        if (!returnReq) throw new NotFoundException('Return request not found');
        if (returnReq.vendorId !== vendorId) throw new ForbiddenException('You do not have access to this return request');

        return this.prisma.returnRequest.update({
            where: { id: returnId },
            data: {
                status: ReturnStatus.REFUND_COMPLETED,
                updatedAt: new Date(),
                ReturnTimeline: {
                    create: {
                        id: randomUUID(),
                        status: ReturnStatus.REFUND_COMPLETED,
                        action: 'VENDOR_COMPLETED',
                        performedBy: 'VENDOR',
                        actorId: vendorId,
                        notes: 'Return process completed by vendor',
                    },
                },
            },
            include: { ReturnTimeline: true },
        });
    }
}
