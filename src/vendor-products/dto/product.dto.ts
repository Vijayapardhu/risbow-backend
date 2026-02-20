import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateProductDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    @Transform(({ value }) => Number(value))
    price: number;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    offerPrice?: number;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    brandName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    sku?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    barcode?: string;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    @Transform(({ value }) => Number(value))
    stock: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    shippingClass?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    weight?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    weightUnit?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    length?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    width?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    height?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    dimensionUnit?: string;
}

export class UpdateProductDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    price?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    offerPrice?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    brandName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    sku?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    barcode?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    stock?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    shippingClass?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    weight?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    weightUnit?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    length?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    width?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => value ? Number(value) : undefined)
    height?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    dimensionUnit?: string;

    @ApiPropertyOptional()
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];
}

export class ProductStatusDto {
    @ApiProperty()
    @IsBoolean()
    isActive: boolean;
}
