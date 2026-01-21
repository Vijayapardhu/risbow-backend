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
var OrderProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let OrderProcessor = OrderProcessor_1 = class OrderProcessor extends bullmq_1.WorkerHost {
    constructor(prisma) {
        super();
        this.prisma = prisma;
        this.logger = new common_1.Logger(OrderProcessor_1.name);
    }
    async process(job) {
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
        }
        catch (error) {
            this.logger.error(`Order job failed: ${error.message}`, error.stack);
            throw error;
        }
    }
    async handleStockDeduction(orderId, data) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }
        const items = order.items;
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
    async handleTimeline(orderId, data) {
        this.logger.log(`Timeline event for order ${orderId}: ${data.status}`);
        this.logger.log(`Timeline entry created for order ${orderId}: ${data.status}`);
        return { success: true, orderId, status: data.status };
    }
    async handleCoinDebit(orderId, data) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { coinsUsedDebited: true },
        });
        if (order?.coinsUsedDebited) {
            this.logger.warn(`Coins already debited for order ${orderId}`);
            return { success: true, alreadyDebited: true };
        }
        await this.prisma.user.update({
            where: { id: data.userId },
            data: {
                coinsBalance: {
                    decrement: data.amount,
                },
            },
        });
        await this.prisma.coinLedger.create({
            data: {
                userId: data.userId,
                amount: -data.amount,
                source: 'ORDER_PAYMENT',
                referenceId: orderId,
            },
        });
        await this.prisma.order.update({
            where: { id: orderId },
            data: { coinsUsedDebited: true },
        });
        this.logger.log(`Coins debited for order ${orderId}: ${data.amount}`);
        return { success: true, orderId, amount: data.amount };
    }
};
exports.OrderProcessor = OrderProcessor;
exports.OrderProcessor = OrderProcessor = OrderProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('orders', {
        concurrency: 5,
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrderProcessor);
//# sourceMappingURL=order.processor.js.map