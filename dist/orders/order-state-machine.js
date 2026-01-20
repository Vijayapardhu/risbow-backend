"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStateMachine = exports.FLOW_COD = exports.FLOW_ONLINE = exports.TERMINAL_STATES = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const OS = client_1.OrderStatus;
exports.TERMINAL_STATES = [
    OS.DELIVERED,
    OS.CANCELLED,
    OS.RETURN_REQUESTED,
    OS.REPLACED
];
exports.FLOW_ONLINE = [
    OS.PENDING_PAYMENT,
    OS.PAID,
    OS.PACKED,
    OS.SHIPPED,
    OS.DELIVERED
];
exports.FLOW_COD = [
    OS.CONFIRMED,
    OS.PACKED,
    OS.SHIPPED,
    OS.DELIVERED
];
let OrderStateMachine = class OrderStateMachine {
    validateTransition(current, next, role, paymentMode = 'ONLINE') {
        const c = current;
        const n = next;
        if (exports.TERMINAL_STATES.includes(c) && c !== OS.DELIVERED) {
            if (c === OS.CANCELLED || c === OS.REPLACED || c === OS.RETURN_REQUESTED) {
                throw new common_1.BadRequestException(`Order is in terminal state ${c}`);
            }
        }
        if (n === OS.CANCELLED) {
            this.validateCancellation(c, role);
            return;
        }
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            return;
        }
        if (role === 'VENDOR') {
            if (![OS.PACKED, OS.SHIPPED].includes(n)) {
                throw new common_1.ForbiddenException('Vendors can only mark PACKED or SHIPPED');
            }
        }
        if (role === 'CUSTOMER') {
            throw new common_1.ForbiddenException('Customers cannot change status directly');
        }
        const flow = paymentMode === 'COD' ? exports.FLOW_COD : exports.FLOW_ONLINE;
        const currentIndex = flow.indexOf(c);
        const nextIndex = flow.indexOf(n);
        if (c === OS.CREATED && n === OS.PENDING_PAYMENT)
            return;
        if (c === OS.CREATED && n === OS.CONFIRMED)
            return;
        if (currentIndex === -1 || nextIndex === -1) {
            if (c === OS.DELIVERED && n === OS.RETURN_REQUESTED)
                return;
            if (n === OS.REPLACED)
                return;
            throw new common_1.BadRequestException(`Invalid status transition from ${c} to ${n}`);
        }
        if (nextIndex <= currentIndex) {
            throw new common_1.BadRequestException('State transitions must be forward-only');
        }
        if (nextIndex > currentIndex + 1) {
            throw new common_1.BadRequestException('Cannot skip states ' + c + ' to ' + n);
        }
    }
    validateCancellation(current, role) {
        if (role === 'CUSTOMER') {
            if ([OS.PACKED, OS.SHIPPED, OS.DELIVERED].includes(current)) {
                throw new common_1.BadRequestException('Cannot cancel order after it has been packed');
            }
        }
    }
};
exports.OrderStateMachine = OrderStateMachine;
exports.OrderStateMachine = OrderStateMachine = __decorate([
    (0, common_1.Injectable)()
], OrderStateMachine);
//# sourceMappingURL=order-state-machine.js.map