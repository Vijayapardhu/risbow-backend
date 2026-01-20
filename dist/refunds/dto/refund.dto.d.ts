export declare enum RefundMethod {
    ORIGINAL_PAYMENT = "ORIGINAL_PAYMENT",
    COINS = "COINS",
    BANK_TRANSFER = "BANK_TRANSFER"
}
export declare class CreateRefundRequestDto {
    orderId: string;
    reason: string;
    amount?: number;
    refundMethod?: RefundMethod;
}
export declare class ProcessRefundDto {
    adminNotes: string;
    approvedAmount: number;
}
