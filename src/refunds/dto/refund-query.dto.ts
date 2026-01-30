import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { RefundStatus, RefundMethod } from '@prisma/client';

export class RefundQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsEnum(RefundStatus)
  @IsOptional()
  status?: RefundStatus;

  @IsEnum(RefundMethod)
  @IsOptional()
  method?: RefundMethod;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
