import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty({ example: 'prod_cuid', description: 'Wholesale productId' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 100, description: 'Requested quantity' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Need best price for 100 units', description: 'Optional message' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class RespondInquiryDto {
  @ApiProperty({ example: 'RESPONDED', description: 'RESPONDED | ACCEPTED | REJECTED' })
  @IsString()
  @IsNotEmpty()
  status: 'RESPONDED' | 'ACCEPTED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Best price ₹380/unit, MOQ 100', description: 'Response message' })
  @IsOptional()
  @IsString()
  response?: string;
}

