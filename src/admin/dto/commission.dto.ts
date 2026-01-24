import { IsNumber, IsString, IsNotEmpty, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryCommissionDto {
    @ApiProperty({ example: 'cat_123' })
    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @ApiProperty({ example: 0.15 })
    @IsNumber()
    @Min(0)
    @Max(0.5) // Max 50% commission
    commissionRate: number;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class VendorCommissionOverrideDto {
    @ApiProperty({ example: 0.125 })
    @IsNumber()
    @Min(0)
    @Max(0.8) // Max 80% override
    overrideRate: number;
}
