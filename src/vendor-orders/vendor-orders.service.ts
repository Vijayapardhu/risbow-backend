import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStateMachine } from '../orders/order-state-machine';
import { OrderStatus, UserRole } from '@prisma/client';

@Injectable()
export class VendorOrdersService {
    constructor(
        private prisma: PrismaService,
        private stateMachine: OrderStateMachine
    ) { }

    async getOrdersForVendor(vendorId: string, page: number = 1, limit: number = 10, status?: string) {
        const offset = (page - 1) * limit;

        // Status Filter Logic
        let statusFilter = '';
        if (status) {
            statusFilter = `AND "status" = '${status}'`;
        }

        // Raw Query to find orders where items array contains an object with vendorId
        // PostgreSQL: items @> '[{"vendorId": "..."}]'

        // Count
        const countQuery = `
            SELECT COUNT(*)::int FROM "Order"
            WHERE "items" @> '[{"vendorId": "${vendorId}"}]'
            ${statusFilter}
        `;
        const totalResult = await this.prisma.$queryRawUnsafe(countQuery);
        // Normalize count result (Postgres returns array of objects with BigInt or string)
        const total = Number(totalResult[0]?.count || 0);

        // Fetch
        const ordersQuery = `
            SELECT * FROM "Order"
            WHERE "items" @> '[{"vendorId": "${vendorId}"}]'
            ${statusFilter}
            ORDER BY "createdAt" DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const orders: any[] = await this.prisma.$queryRawUnsafe(ordersQuery);

        const orderIds = orders.map(o => o.id);
        if (orderIds.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

        const fullOrders = await this.prisma.order.findMany({
            where: { id: { in: orderIds } },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, mobile: true } },
                address: true,
                payment: true
            }
        });

        // Filter items in response to ONLY show this Vendor's items
        const sanitizedOrders = fullOrders.map(order => {
            const allItems = (order.items as any[]) || [];
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

    async getVendorOrderDetails(vendorId: string, orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: { select: { id: true, name: true, mobile: true } },
                address: true,
                payment: true
            }
        });

        if (!order) throw new NotFoundException('Order not found');

        const items = (order.items as any[]) || [];
        const vendorItems = items.filter(i => i.vendorId === vendorId);

        if (vendorItems.length === 0) {
            throw new ForbiddenException('This order does not contain your products');
        }

        return {
            ...order,
            items: vendorItems
        };
    }

    async updateOrderStatus(vendorId: string, orderId: string, status: string) {
        // 1. Verify Ownership
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');

        const items = (order.items as any[]) || [];
        const hasVendorItems = items.some(i => i.vendorId === vendorId);
        if (!hasVendorItems) throw new ForbiddenException('Order does not belong to you');

        // 2. State Machine Validation
        const orderWithPayment = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { payment: true }
        });

        const mode = (orderWithPayment?.payment?.provider === 'COD' || orderWithPayment?.payment?.provider === 'CASH') ? 'COD' : 'ONLINE';

        this.stateMachine.validateTransition(
            order.status,
            status as OrderStatus,
            UserRole.VENDOR,
            mode
        );

        // 3. Update Status
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: status as OrderStatus }
        });
    }
}
