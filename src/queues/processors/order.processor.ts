import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderProcessingJob } from '../queues.service';
import { OrderStatus } from '@prisma/client';

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
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }

        const items = order.items as any[];

        // Deduct stock for each item
        for (const item of items) {
            await this.prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: {
                        decrement: item.quantity,
                    },
                },
            });
        }

        this.logger.log(`Stock deducted for order ${orderId}`);
        return { success: true, orderId, itemsProcessed: items.length };
    }

    private async handleTimeline(orderId: string, data: { status: OrderStatus; notes?: string; changedBy?: string }) {
        await this.prisma.orderTimeline.create({
            data: {
                orderId,
                status: data.status,
                notes: data.notes,
                changedBy: data.changedBy || 'SYSTEM',
            },
        });

        this.logger.log(`Timeline entry created for order ${orderId}: ${data.status}`);
        return { success: true, orderId, status: data.status };
    }

    private async handleCoinDebit(orderId: string, data: { userId: string; amount: number }) {
        // Check if already debited
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { coinsUsedDebited: true },
        });

        if (order?.coinsUsedDebited) {
            this.logger.warn(`Coins already debited for order ${orderId}`);
            return { success: true, alreadyDebited: true };
        }

        // Debit coins
        await this.prisma.user.update({
            where: { id: data.userId },
            data: {
                coinsBalance: {
                    decrement: data.amount,
                },
            },
        });

        // Create ledger entry
        await this.prisma.coinLedger.create({
            data: {
                userId: data.userId,
                amount: -data.amount,
                source: 'ORDER_PAYMENT',
                referenceId: orderId,
            },
        });

        // Mark as debited
        await this.prisma.order.update({
            where: { id: orderId },
            data: { coinsUsedDebited: true },
        });

        this.logger.log(`Coins debited for order ${orderId}: ${data.amount}`);
        return { success: true, orderId, amount: data.amount };
    }
}
