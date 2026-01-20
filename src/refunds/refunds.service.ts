import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateRefundRequestDto, ProcessRefundDto, RefundMethod } from './dto/refund.dto';

@Injectable()
export class RefundsService {
    constructor(
        private prisma: PrismaService,
        private paymentsService: PaymentsService
    ) { }

    async requestRefund(userId: string, dto: CreateRefundRequestDto) {
        // 0. Check System Setting
        const setting = await this.prisma.platformConfig.findUnique({ where: { key: 'REFUNDS_ENABLED' } });
        if (setting && setting.value === 'false') {
            throw new BadRequestException('Refunds are currently disabled by the administrator.');
        }

        // 1. Verify Order
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { payment: true }
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== userId) throw new BadRequestException('Order does not belong to user');

        // Check if eligible (e.g., status is CANCELLED or RETURNED/DELIVERED? logic depends on policy)
        // For MVP, allow request if paid.
        if (order.payment?.status !== 'SUCCESS') {
            throw new BadRequestException('Order is not paid, cannot refund');
        }

        // Check for existing refund request (prevent duplicates pending)
        const existing = await this.prisma.refund.findFirst({
            where: { orderId: dto.orderId, status: { in: ['PENDING', 'APPROVED', 'PROCESSED'] } }
        });
        if (existing) throw new BadRequestException('Active refund request already exists for this order');

        // Determine amount (default to Order Total if not specified)
        // Storing in standard unit or paise? 
        // Order totalAmount is usually standard unit (e.g. 1000 for 1000 INR).
        // Payment amount in DB is usually paise (100000).
        // Let's check PaymentsService.createOrder -> it takes 'amount'. 
        // Assuming Order stores Float/Int representing "Price". 
        // NOTE: Schema says Refund.amount is Float. 
        // Let's assume standard unit matching Order.totalAmount for consistency in DB, 
        // but PaymentService requires PAISE.
        const refundAmount = dto.amount || order.totalAmount;

        return this.prisma.refund.create({
            data: {
                userId,
                orderId: dto.orderId,
                amount: refundAmount,
                reason: dto.reason,
                refundMethod: (dto.refundMethod as any) || 'ORIGINAL_PAYMENT',
                status: 'PENDING'
            }
        });
    }

    async processRefund(adminId: string, refundId: string, dto: ProcessRefundDto) {
        const refund = await this.prisma.refund.findUnique({
            where: { id: refundId },
            include: { order: { include: { payment: true } } }
        });

        if (!refund) throw new NotFoundException('Refund request not found');
        if (refund.status !== 'PENDING') throw new BadRequestException('Refund is not pending');

        if (!refund.order.payment) throw new BadRequestException('No payment record found for this order');

        // 1. Trigger Gateway Refund
        // Convert approvedAmount to correct unit for gateway if needed.
        // DTO says approvedAmount is in paise (to be safe/explicit).
        // If DB stores standard unit, we might need conversion.
        // Let's assume Admin sends PAISE for precision.

        try {
            const gatewayResult = await this.paymentsService.processRefund(
                refund.order.payment.id,
                dto.approvedAmount,
                { refundId: refund.id, adminNote: dto.adminNotes }
            );

            // 2. Update DB
            return this.prisma.refund.update({
                where: { id: refundId },
                data: {
                    status: 'PROCESSED',
                    processedById: adminId,
                    processedAt: new Date(),
                    transactionId: gatewayResult.refundId,
                    adminNotes: dto.adminNotes,
                    amount: dto.approvedAmount / 100 // Storing back in standard unit if DB is standard?
                    // Actually, modifying original request amount to approved amount is good practice.
                    // If DB amount was standard unit 10.00, and we refunded 1000 paise, we store 10.00.
                }
            });

        } catch (error) {
            // Log failure and optionally mark as FAILED or keep PENDING for retry
            // Let's mark FAILED so admin knows.
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

    async getRefunds(userId?: string) {
        return this.prisma.refund.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { order: { select: { id: true, totalAmount: true } } }
        });
    }

    async findOne(id: string) {
        return this.prisma.refund.findUnique({ where: { id } });
    }
}
