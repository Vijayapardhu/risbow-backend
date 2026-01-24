import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToBuyLaterDto {
    @ApiProperty({ example: 'product_id_123', description: 'ID of the product' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiPropertyOptional({ example: 'variant_id_123', description: 'ID of the product variant (if applicable)' })
    @IsOptional()
    @IsString()
    variantId?: string;

    @ApiProperty({ example: 5000, description: 'Target price in paise (e.g., 5000 = ₹50)' })
    @IsNumber()
    @Min(1)
    targetPrice: number;

    @ApiPropertyOptional({ example: 1, description: 'Quantity to buy when price drops', minimum: 1, maximum: 10 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(10)
    quantity?: number = 1;
}

export class UpdateBuyLaterDto {
    @ApiPropertyOptional({ example: 4500, description: 'Updated target price in paise' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    targetPrice?: number;

    @ApiPropertyOptional({ example: 2, description: 'Updated quantity', minimum: 1, maximum: 10 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(10)
    quantity?: number;

    @ApiPropertyOptional({ example: false, description: 'Activate or deactivate buy later entry' })
    @IsOptional()
    isActive?: boolean;
}

export class BuyLaterResponseDto {
    @ApiProperty({ example: 'buy_later_id_123' })
    id: string;

    @ApiProperty({ example: 'product_id_123' })
    productId: string;

    @ApiProperty({ example: 'variant_id_123' })
    variantId?: string;

    @ApiProperty({ example: 5000 })
    targetPrice: number;

    @ApiProperty({ example: 5500 })
    currentPrice: number;

    @ApiProperty({ example: 1 })
    quantity: number;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: false })
    isNotified: boolean;

    @ApiProperty({ example: false })
    isAddedToCart: boolean;

    @ApiProperty({ example: 9.09 })
    priceDropPercent?: number;

    @ApiProperty({ example: '2024-01-15T10:30:00Z' })
    createdAt: string;

    @ApiProperty({ example: '2024-01-15T10:30:00Z' })
    updatedAt: string;

    @ApiProperty()
    product?: any;
}