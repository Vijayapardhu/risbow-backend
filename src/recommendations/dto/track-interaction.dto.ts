import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserInteractionType } from '@prisma/client';

export class TrackInteractionDto {
  @ApiProperty({ 
    description: 'Product ID',
    example: 'prod_123abc',
  })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ 
    description: 'Type of interaction',
    enum: UserInteractionType,
    example: UserInteractionType.VIEW,
  })
  @IsNotEmpty()
  @IsEnum(UserInteractionType)
  interactionType: UserInteractionType;

  @ApiProperty({ 
    description: 'Additional metadata (optional)',
    required: false,
    example: { source: 'home_page', sessionId: 'sess_123' },
  })
  @IsOptional()
  metadata?: any;
}
