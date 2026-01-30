import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';

export class TicketQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
