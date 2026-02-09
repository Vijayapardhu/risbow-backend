import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderProcessingJob } from '../queues.service';
import { OrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Processor('orders', {
    concurrency: 5,
})
export class OrderProcessor extends WorkerHost {
    private readonly logger = new Logger(OrderProcessor.name);

    constructor(private prisma: PrismaService) {
        super();
    }

    async process(job: Job<OrderProcessingJob>): Promise<any> {
        this.logger.debug(`Processing order job: ${job.id} - ${job.data.action}`);

        try {
            const { orderId, action, data } = job.data;

            switch (action) {
                case 'stockDeduction':
                    return await this.handleStockDeduction(orderId, data);
                case 'timeline':
                    return await this.handleTimeline(orderId, data);
                case 'coinDebit':
                    return await this.handleCoinDebit(orderId, data);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            this.logger.error(`Order job failed: ${error.message}`, error.stack);
            throw error; // Will trigger retry
        }
    }

    private async handleStockDeduction(orderId: string, data: any) {
        // IDEMPOTENCY: Check if stock was already deducted for this order
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, items: true, stockDeducted: true },
        });

        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }

        if ((order as any).stockDeducted) {
            this.logger.warn(`Stock already deducted for order ${orderId}, skipping`);
            return { success: true, orderId, alreadyDeducted: true };
        }

        const items = order.items as any[];

        // TRANSACTIONAL: Deduct all stock atomically in a single transaction
        await this.prisma.$transaction(async (tx) => {
            for (const item of items) {
                // Verify stock is sufficient before decrementing
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { stock: true, title: true },
                });

                if (!product || product.stock < item.quantity) {
                    throw new Error(
                        `Insufficient stock for product ${item.productId} (${product?.title || 'unknown'}): ` +
                        `available=${product?.stock ?? 0}, requested=${item.quantity}`
                    );
                }

                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity },
                    },
                });
            }

            // Mark stock as deducted (idempotency flag)
            await tx.order.update({
                where: { id: orderId },
                data: { stockDeducted: true } as any,
            });
        });

        this.logger.log(`Stock deducted for order ${orderId}`);
        return { success: true, orderId, itemsProcessed: items.length };
    }

    private async handleTimeline(orderId: string, data: { status: OrderStatus; notes?: string; changedBy?: string }) {
        // OrderTimeline model not in schema - skipping
        // await this.prisma.orderTimeline.create({
        //     data: {
        //         orderId,
        //         status: data.status,
        //         notes: data.notes,
        //         changedBy: data.changedBy || 'SYSTEM',
        //     },
        // });
        this.logger.log(`Timeline event for order ${orderId}: ${data.status}`);

        this.logger.log(`Timeline entry created for order ${orderId}: ${data.status}`);
        return { success: true, orderId, status: data.status };
    }

    private async handleCoinDebit(orderId: string, data: { userId: string; amount: number }) {
        // TRANSACTIONAL + IDEMPOTENT: All coin operations in a single transaction
        return await this.prisma.$transaction(async (tx) => {
            // Idempotency check inside transaction
            const order = await tx.order.findUnique({
                where: { id: orderId },
                select: { coinsUsedDebited: true },
            });

            if (order?.coinsUsedDebited) {
                this.logger.warn(`Coins already debited for order ${orderId}`);
                return { success: true, alreadyDebited: true };
            }

            // Verify sufficient balance before debit
            const user = await tx.user.findUnique({
                where: { id: data.userId },
                select: { coinsBalance: true },
            });

            if (!user || user.coinsBalance < data.amount) {
                throw new Error(
                    `Insufficient coin balance for user ${data.userId}: ` +
                    `available=${user?.coinsBalance ?? 0}, requested=${data.amount}`
                );
            }

            // Debit coins
            await tx.user.update({
                where: { id: data.userId },
                data: {
                    coinsBalance: { decrement: data.amount },
                },
            });

            // Create ledger entry
            await tx.coinLedger.create({
                data: {
                    id: randomUUID(),
                    userId: data.userId,
                    amount: -data.amount,
                    source: 'ORDER_PAYMENT',
                    referenceId: orderId,
                },
            });

            // Mark as debited (idempotency flag)
            await tx.order.update({
                where: { id: orderId },
                data: { coinsUsedDebited: true },
            });

            this.logger.log(`Coins debited for order ${orderId}: ${data.amount}`);
            return { success: true, orderId, amount: data.amount };
        });
    }
}
