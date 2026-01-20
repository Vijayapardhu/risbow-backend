import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateRefundRequestDto, ProcessRefundDto } from './dto/refund.dto';
export declare class RefundsService {
    private prisma;
    private paymentsService;
    constructor(prisma: PrismaService, paymentsService: PaymentsService);
    requestRefund(userId: string, dto: CreateRefundRequestDto): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RefundStatus;
        updatedAt: Date;
        userId: string;
        orderId: string;
        amount: number;
        reason: string;
        transactionId: string | null;
        adminNotes: string | null;
        refundMethod: import(".prisma/client").$Enums.RefundMethod;
        processedById: string | null;
        processedAt: Date | null;
    }>;
    processRefund(adminId: string, refundId: string, dto: ProcessRefundDto): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RefundStatus;
        updatedAt: Date;
        userId: string;
        orderId: string;
        amount: number;
        reason: string;
        transactionId: string | null;
        adminNotes: string | null;
        refundMethod: import(".prisma/client").$Enums.RefundMethod;
        processedById: string | null;
        processedAt: Date | null;
    }>;
    getRefunds(userId?: string): Promise<({
        order: {
            id: string;
            totalAmount: number;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RefundStatus;
        updatedAt: Date;
        userId: string;
        orderId: string;
        amount: number;
        reason: string;
        transactionId: string | null;
        adminNotes: string | null;
        refundMethod: import(".prisma/client").$Enums.RefundMethod;
        processedById: string | null;
        processedAt: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RefundStatus;
        updatedAt: Date;
        userId: string;
        orderId: string;
        amount: number;
        reason: string;
        transactionId: string | null;
        adminNotes: string | null;
        refundMethod: import(".prisma/client").$Enums.RefundMethod;
        processedById: string | null;
        processedAt: Date | null;
    }>;
}
