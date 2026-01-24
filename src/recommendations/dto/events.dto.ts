import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { UserProductEventType } from '@prisma/client';

export class TrackProductEventDto {
  @ApiProperty({ enum: UserProductEventType, example: 'PRODUCT_VIEW' })
  @IsEnum(UserProductEventType)
  type: UserProductEventType;

  @ApiProperty({ example: 'prod_cuid' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ example: 'var_cuid' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: 'PDP' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

