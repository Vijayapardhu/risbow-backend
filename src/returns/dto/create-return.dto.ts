
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ReturnReason {
    DAMAGED_PRODUCT = 'DAMAGED_PRODUCT',
    WRONG_ITEM = 'WRONG_ITEM',
    MISSING_PARTS = 'MISSING_PARTS',
    QUALITY_ISSUE = 'QUALITY_ISSUE',
    SIZE_FIT_ISSUE = 'SIZE_FIT_ISSUE',
    OTHER = 'OTHER',
}

class ReturnItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty()
    @IsNumber()
    quantity: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    condition?: string;

    @ApiPropertyOptional({ enum: ReturnReason })
    @IsOptional()
    @IsEnum(ReturnReason)
    reason?: ReturnReason;
}

export class CreateReturnDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({ enum: ReturnReason })
    @IsEnum(ReturnReason)
    reason: ReturnReason;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    evidenceImages?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    evidenceVideo?: string;

    @ApiProperty({ type: [ReturnItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReturnItemDto)
    items: ReturnItemDto[];

    @ApiPropertyOptional()
    @IsOptional()
    pickupAddress?: any;
}
