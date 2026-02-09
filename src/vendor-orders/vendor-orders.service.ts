import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStateMachine } from '../orders/order-state-machine';
import { OrderStatus, UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PackingProofService } from './packing-proof.service';

@Injectable()
export class VendorOrdersService {
    constructor(
        private prisma: PrismaService,
        private stateMachine: OrderStateMachine,
        private packingProof: PackingProofService,
    ) { }

    async getOrdersForVendor(vendorId: string, page: number = 1, limit: number = 10, status?: string) {
        const offset = (page - 1) * limit;

        // Raw Query needed due to JSON "items" vendorId filtering.
        // SECURITY: never interpolate untrusted strings into SQL.
        // Use parameterized $queryRaw via Prisma.sql.
        const vendorItemsNeedle = JSON.stringify([{ vendorId }]);
        const statusClause = status ? Prisma.sql`AND "status" = ${status}` : Prisma.empty;

        const totalResult = await this.prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
            SELECT COUNT(*)::int as count FROM "Order"
            WHERE "items" @> ${vendorItemsNeedle}::jsonb
            ${statusClause}
        `);
        const total = Number(totalResult[0]?.count || 0);

        const orders = await this.prisma.$queryRaw<any[]>(Prisma.sql`
            SELECT * FROM "Order"
            WHERE "items" @> ${vendorItemsNeedle}::jsonb
            ${statusClause}
            ORDER BY "createdAt" DESC
            LIMIT ${limit} OFFSET ${offset}
        `);

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
            const allItems = (order.itemsSnapshot as any[]) || [];
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

        const items = (order.itemsSnapshot as any[]) || [];
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
        // 🔐 ENFORCEMENT: Packing proof is mandatory before SHIPPED status
        if (status === 'SHIPPED' || status === OrderStatus.SHIPPED) {
            const hasProof = await this.packingProof.hasProof(orderId);
            if (!hasProof) {
                throw new BadRequestException('Packing video proof is mandatory before order can be shipped. Please upload packing video first.');
            }
        }

        // 1. Verify Ownership
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');

        const items = (order.itemsSnapshot as any[]) || [];
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

        // Trust feature: vendor must upload packing video before marking PACKED.
        if (String(status) === OrderStatus.PACKED) {
            const ok = await this.packingProof.hasProof(orderId);
            if (!ok) {
                throw new BadRequestException('Packing video is required before marking order as PACKED');
            }
        }

        // 3. Update Status
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: status as OrderStatus }
        });
    }
}
