export declare enum ReturnStatus {
    RETURN_REQUESTED = "RETURN_REQUESTED",
    RETURN_APPROVED = "RETURN_APPROVED",
    RETURN_REJECTED = "RETURN_REJECTED",
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED",
    PICKUP_COMPLETED = "PICKUP_COMPLETED",
    QC_IN_PROGRESS = "QC_IN_PROGRESS",
    QC_PASSED = "QC_PASSED",
    QC_FAILED = "QC_FAILED",
    REPLACEMENT_SHIPPED = "REPLACEMENT_SHIPPED",
    REPLACED = "REPLACED"
}
export declare class UpdateReturnStatusDto {
    status: ReturnStatus;
    adminNotes?: string;
    reason?: string;
}
