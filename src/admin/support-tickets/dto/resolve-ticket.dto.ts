import { IsString, IsOptional } from 'class-validator';

export class ResolveTicketDto {
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}