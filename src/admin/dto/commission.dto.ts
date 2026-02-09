import { IsInt, IsString, IsNotEmpty, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryCommissionDto {
    @ApiProperty({ example: 'cat_123' })
    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @ApiProperty({ example: 1500, description: 'Commission rate in basis points (bp). Example: 15% => 1500' })
    @IsInt()
    @Min(0)
    @Max(5000) // Max 50% commission
    commissionRate: number;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class VendorCommissionOverrideDto {
    @ApiProperty({ example: 1250, description: 'Override rate in basis points (bp). Example: 12.5% => 1250' })
    @IsInt()
    @Min(0)
    @Max(8000) // Max 80% override
    overrideRate: number;
}
