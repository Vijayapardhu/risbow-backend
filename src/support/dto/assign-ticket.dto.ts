import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TicketStatus, TicketPriority } from '@prisma/client';

export class AssignTicketDto {
  @IsString()
  assignedTo: string;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTicketPriorityDto {
  @IsEnum(TicketPriority)
  priority: TicketPriority;
}
