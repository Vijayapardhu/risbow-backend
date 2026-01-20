declare enum ReturnStatus {
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED",
    PICKUP_COMPLETED = "PICKUP_COMPLETED",
    QC_IN_PROGRESS = "QC_IN_PROGRESS",
    QC_PASSED = "QC_PASSED",
    QC_FAILED = "QC_FAILED",
    REPLACEMENT_INITIATED = "REPLACEMENT_INITIATED",
    REPLACEMENT_COMPLETED = "REPLACEMENT_COMPLETED"
}
export declare class UpdateReturnStatusDto {
    status: ReturnStatus;
    adminNotes?: string;
    reason?: string;
}
export {};
