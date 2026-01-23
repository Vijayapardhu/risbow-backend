import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RefundMethod {
    ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT',
    COINS = 'COINS',
    BANK_TRANSFER = 'BANK_TRANSFER'
}

export class CreateRefundRequestDto {
    @ApiProperty({ description: 'Order ID to refund' })
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({ description: 'Reason for refund' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    // Amount is usually full order amount or verified calculation. 
    // Allowing user to request specific amount might be risky without backend check.
    // For now, let's assume FULL refund or calculated by backend, 
    // OR user requests partial. Let's allowing optional amount for partial request.
    @ApiPropertyOptional({ description: 'Amount to refund (in paise). If empty, defaults to full order total.' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    amount?: number;

    @ApiPropertyOptional({ description: 'The return request ID triggering this refund' })
    @IsOptional()
    @IsString()
    returnId?: string;

    @ApiPropertyOptional({ enum: RefundMethod, default: RefundMethod.ORIGINAL_PAYMENT })
    @IsOptional()
    @IsEnum(RefundMethod)
    refundMethod?: RefundMethod;
}

export class ProcessRefundDto {
    @ApiProperty({ description: 'Admin notes' })
    @IsString()
    @IsNotEmpty()
    adminNotes: string;

    @ApiProperty({ description: 'Approved Refund Amount (in paise)' })
    @IsNumber()
    @Min(1)
    approvedAmount: number;
}
