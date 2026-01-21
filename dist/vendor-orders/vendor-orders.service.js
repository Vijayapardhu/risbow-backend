"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorOrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const order_state_machine_1 = require("../orders/order-state-machine");
const client_1 = require("@prisma/client");
let VendorOrdersService = class VendorOrdersService {
    constructor(prisma, stateMachine) {
        this.prisma = prisma;
        this.stateMachine = stateMachine;
    }
    async getOrdersForVendor(vendorId, page = 1, limit = 10, status) {
        const offset = (page - 1) * limit;
        let statusFilter = '';
        if (status) {
            statusFilter = `AND "status" = '${status}'`;
        }
        const countQuery = `
            SELECT COUNT(*)::int FROM "Order"
            WHERE "items" @> '[{"vendorId": "${vendorId}"}]'
            ${statusFilter}
        `;
        const totalResult = await this.prisma.$queryRawUnsafe(countQuery);
        const total = Number(totalResult[0]?.count || 0);
        const ordersQuery = `
            SELECT * FROM "Order"
            WHERE "items" @> '[{"vendorId": "${vendorId}"}]'
            ${statusFilter}
            ORDER BY "createdAt" DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const orders = await this.prisma.$queryRawUnsafe(ordersQuery);
        const orderIds = orders.map(o => o.id);
        if (orderIds.length === 0)
            return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        const fullOrders = await this.prisma.order.findMany({
            where: { id: { in: orderIds } },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, mobile: true } },
                address: true,
                payment: true
            }
        });
        const sanitizedOrders = fullOrders.map(order => {
            const allItems = order.items || [];
            const vendorItems = allItems.filter(i => i.vendorId === vendorId);
            return {
                ...order,
                items: vendorItems
            };
        });
        return {
            data: sanitizedOrders,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async getVendorOrderDetails(vendorId, orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: { select: { id: true, name: true, mobile: true } },
                address: true,
                payment: true
            }
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const items = order.items || [];
        const vendorItems = items.filter(i => i.vendorId === vendorId);
        if (vendorItems.length === 0) {
            throw new common_1.ForbiddenException('This order does not contain your products');
        }
        return {
            ...order,
            items: vendorItems
        };
    }
    async updateOrderStatus(vendorId, orderId, status) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const items = order.items || [];
        const hasVendorItems = items.some(i => i.vendorId === vendorId);
        if (!hasVendorItems)
            throw new common_1.ForbiddenException('Order does not belong to you');
        const orderWithPayment = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { payment: true }
        });
        const mode = (orderWithPayment?.payment?.provider === 'COD' || orderWithPayment?.payment?.provider === 'CASH') ? 'COD' : 'ONLINE';
        this.stateMachine.validateTransition(order.status, status, client_1.UserRole.VENDOR, mode);
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: status }
        });
    }
};
exports.VendorOrdersService = VendorOrdersService;
exports.VendorOrdersService = VendorOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        order_state_machine_1.OrderStateMachine])
], VendorOrdersService);
//# sourceMappingURL=vendor-orders.service.js.map