import { IsString, IsOptional, IsEnum, IsArray, IsNotEmpty } from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateSupportTicketDto {
  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  assignedTo?: string;
}