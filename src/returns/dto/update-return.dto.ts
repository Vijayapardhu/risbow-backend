
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReturnStatus { // Exporting for reuse if needed, though usually Prisma's is better
    RETURN_REQUESTED = 'RETURN_REQUESTED',
    RETURN_APPROVED = 'RETURN_APPROVED',
    RETURN_REJECTED = 'RETURN_REJECTED',
    PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
    PICKUP_COMPLETED = 'PICKUP_COMPLETED',
    QC_IN_PROGRESS = 'QC_IN_PROGRESS',
    QC_PASSED = 'QC_PASSED',
    QC_FAILED = 'QC_FAILED',
    REPLACEMENT_SHIPPED = 'REPLACEMENT_SHIPPED',
    REPLACED = 'REPLACED',
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
