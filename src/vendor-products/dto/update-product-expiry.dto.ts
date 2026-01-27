import { IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductExpiryDto {
  @ApiProperty({
    description: 'Product expiry date (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({
    description: 'Disable auto-clearance for this product',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  disableAutoClearance?: boolean;
}

export class BulkUpdateExpiryDto {
  @ApiProperty({
    description: 'Array of product IDs',
    example: ['product1', 'product2'],
    type: [String],
  })
  productIds: string[];

  @ApiProperty({
    description: 'Product expiry date (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  expiryDate: string;

  @ApiProperty({
    description: 'Disable auto-clearance for these products',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  disableAutoClearance?: boolean;
}
