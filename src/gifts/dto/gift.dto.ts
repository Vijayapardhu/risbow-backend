import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsArray, Min } from 'class-validator';

export class CreateGiftDto {
    @ApiProperty({ example: 'Premium Headphones', description: 'Gift title' })
    @IsString()
    title: string;

    @ApiProperty({ example: 100, description: 'Initial stock quantity' })
    @IsInt()
    @Min(0)
    stock: number;

    @ApiProperty({ example: 500, description: 'Cost of the gift in INR' })
    @IsInt()
    @Min(0)
    cost: number;

    @ApiPropertyOptional({
        example: ['cat_electronics', 'cat_mobiles'],
        description: 'Array of category IDs eligible for this gift',
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    eligibleCategories?: string[];
}

export class UpdateGiftDto {
    @ApiPropertyOptional({ example: 'Premium Headphones - Updated' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @IsInt()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ example: 600 })
    @IsOptional()
    @IsInt()
    @Min(0)
    cost?: number;

    @ApiPropertyOptional({ example: ['cat_electronics'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    eligibleCategories?: string[];
}

export class SelectGiftDto {
    @ApiProperty({ example: 'gift_123', description: 'Gift SKU ID to select' })
    @IsString()
    giftId: string;
}

export class GiftResponseDto {
    @ApiProperty({ example: 'gift_123' })
    id: string;

    @ApiProperty({ example: 'Premium Headphones' })
    title: string;

    @ApiProperty({ example: 100 })
    stock: number;

    @ApiProperty({ example: 500 })
    cost: number;

    @ApiProperty({ example: ['cat_electronics', 'cat_mobiles'] })
    eligibleCategories: string[];

    @ApiProperty({ example: true, description: 'Whether this gift is eligible for current cart' })
    isEligible?: boolean;

    @ApiProperty()
    createdAt: Date;
}

export class EligibleGiftsQueryDto {
    @ApiPropertyOptional({
        example: 'cat_electronics,cat_mobiles',
        description: 'Comma-separated category IDs from cart',
    })
    @IsOptional()
    @IsString()
    categories?: string;
}
