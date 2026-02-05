import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnStatus, RefundMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class VendorReturnQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by return status',
    enum: ReturnStatus,
  })
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @ApiPropertyOptional({ description: 'Filter returns from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter returns to date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Search by return number or order number' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AcceptReturnDto {
  @ApiPropertyOptional({ description: 'Notes for accepting the return' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Scheduled pickup date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  pickupDate?: string;
}

export class RejectReturnDto {
  @ApiProperty({ description: 'Reason for rejecting the return request' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class ProcessRefundDto {
  @ApiProperty({ description: 'Refund amount in smallest currency unit (paise)' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({
    description: 'Refund method',
    enum: RefundMethod,
    default: 'ORIGINAL_PAYMENT',
  })
  @IsOptional()
  @IsEnum(RefundMethod)
  method?: RefundMethod;

  @ApiPropertyOptional({ description: 'Notes for the refund' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnStatsResponse {
  @ApiProperty({ description: 'Total return requests for vendor' })
  total: number;

  @ApiProperty({ description: 'Pending approval count' })
  pending: number;

  @ApiProperty({ description: 'Approved returns count' })
  approved: number;

  @ApiProperty({ description: 'Rejected returns count' })
  rejected: number;

  @ApiProperty({ description: 'Refund completed count' })
  refunded: number;

  @ApiProperty({ description: 'Total refund amount processed' })
  totalRefundAmount: number;

  @ApiProperty({ description: 'Returns in last 30 days' })
  last30Days: number;
}
