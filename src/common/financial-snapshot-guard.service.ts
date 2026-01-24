import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { AuditLogService } from '../audit/audit.service';

/**
 * Financial Snapshot Guard Service
 * 
 * Enforces immutability of OrderFinancialSnapshot after order confirmation.
 * This is a critical safety measure to prevent financial data corruption.
 */
@Injectable()
export class FinancialSnapshotGuardService {
    private readonly logger = new Logger(FinancialSnapshotGuardService.name);

    constructor(
        private prisma: PrismaService,
        private auditLog: AuditLogService,
    ) {}

    /**
     * Checks if a financial snapshot can be modified.
     * Snapshots become immutable once the order status moves beyond PENDING.
     * 
     * @param orderId - The order ID to check
     * @returns true if snapshot can be modified, false otherwise
     */
    async canModifySnapshot(orderId: string): Promise<boolean> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { status: true }
        });

        if (!order) {
            return false;
        }

        // Only PENDING orders allow snapshot modifications
        return order.status === OrderStatus.PENDING;
    }

    /**
     * Validates that a snapshot modification is allowed.
     * Throws BadRequestException if modification is not allowed.
     * 
     * @param orderId - The order ID
     * @param actorId - ID of the user/admin attempting the change
     * @param actorRole - Role of the user/admin
     * @throws BadRequestException if snapshot is immutable
     */
    async validateSnapshotModification(
        orderId: string,
        actorId?: string,
        actorRole?: string,
    ): Promise<void> {
        const canModify = await this.canModifySnapshot(orderId);

        if (!canModify) {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                select: { status: true }
            });

            // Log the attempted violation
            if (actorId) {
                await this.auditLog.logAdminAction(
                    actorId,
                    'ATTEMPTED_SNAPSHOT_MODIFICATION',
                    'OrderFinancialSnapshot',
                    orderId,
                    {
                        orderStatus: order?.status,
                        reason: 'Financial snapshot is immutable after order confirmation',
                        actorRole: actorRole || 'UNKNOWN',
                    }
                ).catch(err => {
                    this.logger.error(`Failed to log snapshot modification attempt: ${err.message}`);
                });
            }

            this.logger.warn(
                `Attempted modification of immutable financial snapshot for order ${orderId} (status: ${order?.status})`
            );

            throw new BadRequestException(
                `Financial snapshot cannot be modified. Order status is ${order?.status}. ` +
                `Snapshots become immutable after order confirmation.`
            );
        }
    }

    /**
     * Checks if an order has a confirmed status (snapshot should be immutable).
     * 
     * @param orderId - The order ID
     * @returns true if order is confirmed (snapshot immutable), false otherwise
     */
    async isSnapshotImmutable(orderId: string): Promise<boolean> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { status: true }
        });

        if (!order) {
            return false;
        }

        // All statuses except PENDING make snapshot immutable
        return order.status !== OrderStatus.PENDING;
    }
}
