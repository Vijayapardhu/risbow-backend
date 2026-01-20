import { OrderStatus, UserRole } from '@prisma/client';
export declare const TERMINAL_STATES: any[];
export declare const FLOW_ONLINE: any[];
export declare const FLOW_COD: any[];
export declare class OrderStateMachine {
    validateTransition(current: OrderStatus, next: OrderStatus, role: UserRole, paymentMode?: string): void;
    validateCancellation(current: any, role: UserRole): void;
}
