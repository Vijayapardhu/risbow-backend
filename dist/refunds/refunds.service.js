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
exports.RefundsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const payments_service_1 = require("../payments/payments.service");
let RefundsService = class RefundsService {
    constructor(prisma, paymentsService) {
        this.prisma = prisma;
        this.paymentsService = paymentsService;
    }
    async requestRefund(userId, dto) {
        const setting = await this.prisma.platformConfig.findUnique({ where: { key: 'REFUNDS_ENABLED' } });
        if (setting && setting.value === 'false') {
            throw new common_1.BadRequestException('Refunds are currently disabled by the administrator.');
        }
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { payment: true }
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.userId !== userId)
            throw new common_1.BadRequestException('Order does not belong to user');
        if (order.payment?.status !== 'SUCCESS') {
            throw new common_1.BadRequestException('Order is not paid, cannot refund');
        }
        const existing = await this.prisma.refund.findFirst({
            where: { orderId: dto.orderId, status: { in: ['PENDING', 'APPROVED', 'PROCESSED'] } }
        });
        if (existing)
            throw new common_1.BadRequestException('Active refund request already exists for this order');
        const refundAmount = dto.amount || order.totalAmount;
        return this.prisma.refund.create({
            data: {
                userId,
                orderId: dto.orderId,
                amount: refundAmount,
                reason: dto.reason,
                refundMethod: dto.refundMethod || 'ORIGINAL_PAYMENT',
                status: 'PENDING'
            }
        });
    }
    async processRefund(adminId, refundId, dto) {
        const refund = await this.prisma.refund.findUnique({
            where: { id: refundId },
            include: { order: { include: { payment: true } } }
        });
        if (!refund)
            throw new common_1.NotFoundException('Refund request not found');
        if (refund.status !== 'PENDING')
            throw new common_1.BadRequestException('Refund is not pending');
        if (!refund.order.payment)
            throw new common_1.BadRequestException('No payment record found for this order');
        try {
            const gatewayResult = await this.paymentsService.processRefund(refund.order.payment.id, dto.approvedAmount, { refundId: refund.id, adminNote: dto.adminNotes });
            return this.prisma.refund.update({
                where: { id: refundId },
                data: {
                    status: 'PROCESSED',
                    processedById: adminId,
                    processedAt: new Date(),
                    transactionId: gatewayResult.refundId,
                    adminNotes: dto.adminNotes,
                    amount: dto.approvedAmount / 100
                }
            });
        }
        catch (error) {
            await this.prisma.refund.update({
                where: { id: refundId },
                data: {
                    status: 'FAILED',
                    processedById: adminId,
                    processedAt: new Date(),
                    adminNotes: `FAILED: ${error.message}`
                }
            });
            throw error;
        }
    }
    async getRefunds(userId) {
        return this.prisma.refund.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { order: { select: { id: true, totalAmount: true } } }
        });
    }
    async findOne(id) {
        return this.prisma.refund.findUnique({ where: { id } });
    }
};
exports.RefundsService = RefundsService;
exports.RefundsService = RefundsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payments_service_1.PaymentsService])
], RefundsService);
//# sourceMappingURL=refunds.service.js.map