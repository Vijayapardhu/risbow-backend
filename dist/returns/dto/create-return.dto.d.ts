declare enum ReturnReason {
    DAMAGED_PRODUCT = "DAMAGED_PRODUCT",
    WRONG_ITEM = "WRONG_ITEM",
    MISSING_PARTS = "MISSING_PARTS",
    QUALITY_ISSUE = "QUALITY_ISSUE",
    SIZE_FIT_ISSUE = "SIZE_FIT_ISSUE",
    OTHER = "OTHER"
}
declare class ReturnItemDto {
    productId: string;
    quantity: number;
    condition?: string;
    reason?: ReturnReason;
}
export declare class CreateReturnDto {
    orderId: string;
    reason: ReturnReason;
    description?: string;
    evidenceImages?: string[];
    evidenceVideo?: string;
    items: ReturnItemDto[];
    pickupAddress?: any;
}
export {};
