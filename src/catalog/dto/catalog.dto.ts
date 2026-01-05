
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsInt()
    @Min(0)
    price: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    offerPrice?: number;

    @IsNotEmpty()
    @IsString()
    categoryId: string;

    @IsOptional()
    @IsInt()
    stock?: number;

    @IsOptional()
    @IsString()
    vendorId?: string; // In real app, this comes from JWT/Context if vendor logs in

    @IsOptional()
    isWholesale?: boolean;

    @IsOptional()
    wholesalePrice?: number;

    @IsOptional()
    moq?: number;
}

export class ProductFilterDto {
    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    price_lt?: number;

    @IsOptional()
    @IsString()
    search?: string;
}
