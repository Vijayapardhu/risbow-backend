import { IsArray, IsString, IsOptional, IsBoolean, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkUpdateUserDto {
  @ApiProperty({ 
    description: 'Array of user IDs to update',
    example: ['user1', 'user2', 'user3']
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];

  @ApiPropertyOptional({ 
    description: 'New status for users',
    example: 'ACTIVE'
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ 
    description: 'New role for users',
    example: 'CUSTOMER'
  })
  @IsOptional()
  @IsString()
  role?: string;
}

export class BulkDeleteUserDto {
  @ApiProperty({ 
    description: 'Array of user IDs to delete',
    example: ['user1', 'user2', 'user3']
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];
}

export class BulkUpdateProductDto {
  @ApiProperty({ 
    description: 'Array of product IDs to update',
    example: ['prod1', 'prod2', 'prod3']
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds: string[];

  @ApiPropertyOptional({ 
    description: 'Whether to activate/deactivate products',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    description: 'Whether to approve products',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}

export class BulkDeleteProductDto {
  @ApiProperty({ 
    description: 'Array of product IDs to delete',
    example: ['prod1', 'prod2', 'prod3']
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds: string[];
}

export class BulkUpdateVendorDto {
  @ApiProperty({ 
    description: 'Array of vendor IDs to update',
    example: ['vend1', 'vend2', 'vend3']
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  vendorIds: string[];

  @ApiPropertyOptional({ 
    description: 'KYC status for vendors',
    example: 'VERIFIED'
  })
  @IsOptional()
  @IsString()
  kycStatus?: string;

  @ApiPropertyOptional({ 
    description: 'Store status for vendors',
    example: 'ACTIVE'
  })
  @IsOptional()
  @IsString()
  storeStatus?: string;
}

export class BulkDeleteVendorDto {
  @ApiProperty({ 
    description: 'Array of vendor IDs to delete',
    example: ['vend1', 'vend2', 'vend3']
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  vendorIds: string[];
}