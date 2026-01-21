import { ReturnStatus } from '@prisma/client';
export declare class UpdateReturnStatusDto {
    status: ReturnStatus;
    adminNotes?: string;
    reason?: string;
}
