import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { RefundStatus } from '@prisma/client';

export class ProcessRefundDto {
  @IsEnum(RefundStatus)
  @IsNotEmpty()
  status: RefundStatus;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
