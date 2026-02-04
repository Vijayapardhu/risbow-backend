import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { AuditLogService } from '../audit/audit.service';

/**
 * Order State Validator Service
 * 
 * Enforces valid state transitions for orders to prevent illegal jumps
 * (e.g., PENDING -> DELIVERED without going through CONFIRMED, PAID, etc.)
 */
@Injectable()
export class OrderStateValidatorService {
    private readonly logger = new Logger(OrderStateValidatorService.name);

    // Define valid state transitions
    // Note: CREATED and PENDING_PAYMENT are also valid statuses
    private readonly validTransitions: Map<OrderStatus, OrderStatus[]> = new Map([
        [OrderStatus.CREATED, [
            OrderStatus.PENDING,
            OrderStatus.PENDING_PAYMENT,
            OrderStatus.CANCELLED,
        ]],
        [OrderStatus.PENDING, [
            OrderStatus.PENDING_PAYMENT,
            OrderStatus.CONFIRMED,
            OrderStatus.CANCELLED,
        ]],
        [OrderStatus.PENDING_PAYMENT, [
            OrderStatus.CONFIRMED,
            OrderStatus.CANCELLED,
        ]],
        [OrderStatus.CONFIRMED, [
            OrderStatus.PAID,
            OrderStatus.PACKED,
            OrderStatus.CANCELLED,
        ]],
        [OrderStatus.PAID, [
            OrderStatus.PACKED,
            OrderStatus.CANCELLED,
        ]],
        [OrderStatus.PACKED, [
            OrderStatus.SHIPPED,
            OrderStatus.CANCELLED,
        ]],
        [OrderStatus.SHIPPED, [
            OrderStatus.DELIVERED,
            OrderStatus.OUT_FOR_INSPECTION,
            OrderStatus.CANCELLED,
        ]],
        [OrderStatus.OUT_FOR_INSPECTION, [
            OrderStatus.DELIVERED,
            OrderStatus.RETURNED, // Failed inspection / Rejected
            OrderStatus.CANCELLED
        ]],
        [OrderStatus.DELIVERED, [
            // Delivered is final, but can be cancelled for returns
            OrderStatus.CANCELLED,
            OrderStatus.RETURN_REQUESTED,
        ]],
        [OrderStatus.RETURN_REQUESTED, [
            OrderStatus.RETURN_PICKED_UP,
            OrderStatus.CANCELLED // Request cancelled
        ]],
        [OrderStatus.RETURN_PICKED_UP, [
            OrderStatus.QC_IN_PROGRESS,
            OrderStatus.RETURN_RECEIVED,
        ]],
        [OrderStatus.QC_IN_PROGRESS, [
            OrderStatus.RETURNED, // Verification Passed (Refund)
            OrderStatus.DELIVERED, // Verification Failed (Return rejected, item sent back?) - keeping simple
        ]],
        [OrderStatus.CANCELLED, [
            // Cancelled is final - no transitions allowed
        ]],
    ]);

    constructor(private auditLog: AuditLogService) { }

    /**
     * Validates if a state transition is allowed.
     * 
     * @param fromStatus - Current order status
     * @param toStatus - Desired new status
     * @returns true if transition is valid, false otherwise
     */
    isValidTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
        // Same status is always valid (idempotent)
        if (fromStatus === toStatus) {
            return true;
        }

        // Get allowed transitions for current status
        const allowedTransitions = this.validTransitions.get(fromStatus);

        if (!allowedTransitions) {
            this.logger.warn(`Unknown fromStatus: ${fromStatus}`);
            return false;
        }

        return allowedTransitions.includes(toStatus);
    }

    /**
     * Validates a state transition and throws if invalid.
     * 
     * @param fromStatus - Current order status
     * @param toStatus - Desired new status
     * @param orderId - Order ID for logging
     * @param actorId - ID of user/admin making the change
     * @param actorRole - Role of the actor
     * @param allowAdminOverride - Whether admin override is allowed (default: false)
     * @throws BadRequestException if transition is invalid
     */
    async validateTransition(
        fromStatus: OrderStatus,
        toStatus: OrderStatus,
        orderId: string,
        actorId?: string,
        actorRole?: string,
        allowAdminOverride: boolean = false,
    ): Promise<void> {
        // Same status is always valid
        if (fromStatus === toStatus) {
            return;
        }

        const isValid = this.isValidTransition(fromStatus, toStatus);

        if (!isValid) {
            // Log the attempted illegal transition
            if (actorId) {
                await this.auditLog.logAdminAction(
                    actorId,
                    'ATTEMPTED_ILLEGAL_STATE_TRANSITION',
                    'Order',
                    orderId,
                    {
                        fromStatus,
                        toStatus,
                        reason: 'Illegal state transition detected',
                        actorRole: actorRole || 'UNKNOWN',
                        allowAdminOverride,
                    }
                ).catch(err => {
                    this.logger.error(`Failed to log illegal transition attempt: ${err.message}`);
                });
            }

            this.logger.warn(
                `Illegal state transition attempted for order ${orderId}: ${fromStatus} -> ${toStatus}`
            );

            // If admin override is explicitly allowed, log but don't throw
            if (allowAdminOverride && actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN') {
                this.logger.warn(
                    `Admin override allowed for order ${orderId}: ${fromStatus} -> ${toStatus}`
                );
                return;
            }

            throw new BadRequestException(
                `Invalid state transition: Cannot change order status from ${fromStatus} to ${toStatus}. ` +
                `Allowed transitions from ${fromStatus}: ${this.validTransitions.get(fromStatus)?.join(', ') || 'none'}`
            );
        }
    }

    /**
     * Gets all valid next states for a given order status.
     * 
     * @param currentStatus - Current order status
     * @returns Array of valid next statuses
     */
    getValidNextStates(currentStatus: OrderStatus): OrderStatus[] {
        return this.validTransitions.get(currentStatus) || [];
    }
}
