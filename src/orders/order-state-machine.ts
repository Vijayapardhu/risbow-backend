import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';

// Bypass TS strict check for new keys
const OS: any = OrderStatus;

export const TERMINAL_STATES = [
    OS.DELIVERED,
    OS.CANCELLED,
    OS.RETURN_REQUESTED,
    OS.REPLACED
];

export const FLOW_ONLINE = [
    OS.PENDING_PAYMENT,
    OS.PAID,
    OS.PACKED,
    OS.SHIPPED,
    OS.DELIVERED
];

export const FLOW_COD = [
    OS.CONFIRMED,
    OS.PACKED,
    OS.SHIPPED,
    OS.DELIVERED
];

@Injectable()
export class OrderStateMachine {

    validateTransition(current: OrderStatus, next: OrderStatus, role: UserRole, paymentMode: string = 'ONLINE') {
        const c = current as any;
        const n = next as any;

        // 1. Terminal Check
        if (TERMINAL_STATES.includes(c) && c !== OS.DELIVERED) {
            if (c === OS.CANCELLED || c === OS.REPLACED || c === OS.RETURN_REQUESTED) {
                throw new BadRequestException(`Order is in terminal state ${c}`);
            }
        }

        // 2. Cancellation Rules
        if (n === OS.CANCELLED) {
            this.validateCancellation(c, role);
            return;
        }

        // 3. Admin Override
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            return;
        }

        // 4. Role Permissions
        if (role === 'VENDOR') {
            if (![OS.PACKED, OS.SHIPPED].includes(n)) {
                throw new ForbiddenException('Vendors can only mark PACKED or SHIPPED');
            }
        }
        if (role === 'CUSTOMER') {
            throw new ForbiddenException('Customers cannot change status directly');
        }

        // 5. Flow Validation
        const flow = paymentMode === 'COD' ? FLOW_COD : FLOW_ONLINE;
        const currentIndex = flow.indexOf(c);
        const nextIndex = flow.indexOf(n);

        // Allow Init jumps
        if (c === OS.CREATED && n === OS.PENDING_PAYMENT) return;
        if (c === OS.CREATED && n === OS.CONFIRMED) return;

        if (currentIndex === -1 || nextIndex === -1) {
            if (c === OS.DELIVERED && n === OS.RETURN_REQUESTED) return;
            if (n === OS.REPLACED) return;

            throw new BadRequestException(`Invalid status transition from ${c} to ${n}`);
        }

        if (nextIndex <= currentIndex) {
            throw new BadRequestException('State transitions must be forward-only');
        }

        if (nextIndex > currentIndex + 1) {
            throw new BadRequestException('Cannot skip states ' + c + ' to ' + n);
        }
    }

    validateCancellation(current: any, role: UserRole) {
        if (role === 'CUSTOMER') {
            if ([OS.PACKED, OS.SHIPPED, OS.DELIVERED].includes(current)) {
                throw new BadRequestException('Cannot cancel order after it has been packed');
            }
        }
    }
}
