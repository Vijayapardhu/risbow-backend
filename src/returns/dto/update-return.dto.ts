
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ReturnStatus {
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
    PICKUP_COMPLETED = 'PICKUP_COMPLETED',
    QC_IN_PROGRESS = 'QC_IN_PROGRESS',
    QC_PASSED = 'QC_PASSED',
    QC_FAILED = 'QC_FAILED',
    REPLACEMENT_INITIATED = 'REPLACEMENT_INITIATED',
    REPLACEMENT_COMPLETED = 'REPLACEMENT_COMPLETED',
}

export class UpdateReturnStatusDto {
    @ApiProperty({ enum: ReturnStatus })
    @IsEnum(ReturnStatus)
    @IsNotEmpty()
    status: ReturnStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adminNotes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string; // For rejection or specific failure reasons
}
