import { RefundsService } from './refunds.service';
import { CreateRefundRequestDto, ProcessRefundDto } from './dto/refund.dto';
export declare class RefundsController {
    private readonly refundsService;
    constructor(refundsService: RefundsService);
    requestRefund(req: any, dto: CreateRefundRequestDto): Promise<{
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
    getMyRefunds(req: any): Promise<({
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
    processRefund(req: any, id: string, dto: ProcessRefundDto): Promise<{
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
