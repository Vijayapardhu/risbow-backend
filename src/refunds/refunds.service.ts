import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateRefundRequestDto, ProcessRefundDto, RefundMethod } from './dto/refund.dto';
import { ReturnStatus } from '@prisma/client';

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
                status: 'PENDING',
                returnId: dto.returnId
            }
        });
    }

    async processRefund(adminId: string, refundId: string, dto: ProcessRefundDto) {
        const refund = await this.prisma.refund.findUnique({
            where: { id: refundId },
            include: { order: { include: { payment: true } } }  // items is JSON field, not relation
        });

        if (!refund) throw new NotFoundException('Refund request not found');
        if (refund.status !== 'PENDING') throw new BadRequestException('Refund is not pending');

        if (!refund.order.payment) throw new BadRequestException('No payment record found for this order');

        // 🔐 P0 FIX: VALIDATE REFUND AMOUNT
        const maxRefundAmount = refund.order.totalAmount * 100; // Convert to paise
        if (dto.approvedAmount > maxRefundAmount) {
            throw new BadRequestException(`Refund amount (₹${dto.approvedAmount / 100}) cannot exceed order total (₹${refund.order.totalAmount})`);
        }

        // 1. Trigger Gateway Refund
        try {
            const gatewayResult = await this.paymentsService.processRefund(
                refund.order.payment.id,
                dto.approvedAmount,
                adminId,  // Pass adminId for audit logging
                { refundId: refund.id, adminNote: dto.adminNotes }
            );

            // 2. Update Refund Record
            const updatedRefund = await this.prisma.refund.update({
                where: { id: refundId },
                data: {
                    status: 'PROCESSED',
                    processedById: adminId,
                    processedAt: new Date(),
                    transactionId: gatewayResult.refundId,
                    adminNotes: dto.adminNotes,
                    amount: dto.approvedAmount / 100 // Store in standard unit
                }
            });

            // Update ReturnRequest if linked
            if (refund.returnId) {
                await this.prisma.returnRequest.update({
                    where: { id: refund.returnId },
                    data: {
                        status: ReturnStatus.REFUND_COMPLETED,
                        timeline: {
                            create: {
                                status: ReturnStatus.REFUND_COMPLETED,
                                action: 'REFUND_PROCESSED',
                                performedBy: 'SYSTEM',
                                notes: `Refund ₹${dto.approvedAmount / 100} processed. Transaction: ${gatewayResult.refundId}`
                            }
                        }
                    }
                });
            }

            // 🔐 P0 FIX: RESTORE STOCK
            // Restore stock for all items in the order
            const orderItems = Array.isArray(refund.order.items) ? (refund.order.items as any[]) : [];
            for (const item of orderItems) {
                if (item.variantId) {
                    // Restore variant stock (JSON-based)
                    const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
                    if (product) {
                        const variants = (product.variants as any[]) || [];
                        const variantIndex = variants.findIndex(v => v.id === item.variantId);
                        if (variantIndex !== -1) {
                            variants[variantIndex].stock += item.quantity;
                            const newTotalStock = variants.reduce((acc, v) => acc + (v.isActive ? v.stock : 0), 0);
                            await this.prisma.product.update({
                                where: { id: item.productId },
                                data: { variants: variants as any, stock: newTotalStock }
                            });
                        }
                    }
                } else {
                    // Restore base product stock
                    await this.prisma.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                }
            }

            // 🔐 P0 FIX: RESTORE COINS (if used)
            if (refund.order.coinsUsed > 0) {
                // Import CoinsService if not already imported
                // For now, direct DB update (should use CoinsService.credit)
                await this.prisma.user.update({
                    where: { id: refund.order.userId },
                    data: { coinsBalance: { increment: refund.order.coinsUsed } }
                });

                // Create ledger entry
                await this.prisma.coinLedger.create({
                    data: {
                        userId: refund.order.userId,
                        amount: refund.order.coinsUsed,
                        source: 'REFUND',
                        referenceId: refund.order.id,
                        isExpired: false
                    }
                });
            }

            return updatedRefund;

        } catch (error) {
            // Log failure and mark as FAILED
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

    async getAllRefunds() {
        return this.prisma.refund.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                order: { include: { payment: true } },
                user: { select: { id: true, name: true, email: true } }
            }
        });
    }

    async findOne(id: string) {
        return this.prisma.refund.findUnique({ where: { id } });
    }
}
