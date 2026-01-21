
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnStatus } from '@prisma/client';

export class UpdateReturnStatusDto {
    @ApiProperty({ enum: ReturnStatus })
    @IsEnum(ReturnStatus)
    @IsNotEmpty()
    status: ReturnStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adminNotes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string; // For rejection or specific failure reasons
}
