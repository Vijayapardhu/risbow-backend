import { IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddCartItemDto {
    @ApiProperty({ example: 'prod_123', description: 'ID of the product' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiPropertyOptional({ example: 'var_456', description: 'ID of the product variation (optional)' })
    @IsOptional()
    @IsString()
    variantId?: string;

    @ApiProperty({ example: 1, description: 'Quantity to add', minimum: 1 })
    @IsInt()
    @Min(1)
    quantity: number;
}

export class UpdateCartItemDto {
    @ApiProperty({ example: 2, description: 'New quantity', minimum: 1 })
    @IsInt()
    @Min(1)
    quantity: number;
}

export class SyncCartItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    variantId?: string;

    @ApiProperty({ minimum: 1 })
    @IsInt()
    @Min(1)
    quantity: number;
}

export class SyncCartDto {
    @ApiProperty({ type: [SyncCartItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SyncCartItemDto)
    items: SyncCartItemDto[];
}
