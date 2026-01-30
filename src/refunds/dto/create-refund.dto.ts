import { IsString, IsNumber, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { RefundMethod } from '@prisma/client';

export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsOptional()
  returnId?: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsEnum(RefundMethod)
  method: RefundMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}
