import { IsString, IsOptional, IsEnum, IsNotEmpty, IsArray } from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsEnum(TicketCategory)
  @IsNotEmpty()
  category: TicketCategory;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
