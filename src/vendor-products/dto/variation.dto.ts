import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VariationStatus {
    ACTIVE = 'ACTIVE',
    OUT_OF_STOCK = 'OUT_OF_STOCK'
}

export class VariationAttributesDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    size?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    color?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    material?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    style?: string;
}

export class VariationDto {
    @ApiPropertyOptional({ description: 'ID is generated on creation' })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ type: VariationAttributesDto })
    @IsObject()
    @ValidateNested()
    @Type(() => VariationAttributesDto)
    attributes: VariationAttributesDto;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @IsOptional()
    offerPrice?: number;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    stock: number;

    @ApiProperty({ enum: VariationStatus })
    @IsEnum(VariationStatus)
    status: VariationStatus;
}
