
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
    @IsString()
    sku?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @IsString()
    brandName?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    // Logistics
    @IsOptional()
    @Type(() => Number)
    weight?: number;

    @IsOptional()
    @IsString()
    weightUnit?: string;

    @IsOptional()
    @Type(() => Number)
    length?: number;

    @IsOptional()
    @Type(() => Number)
    width?: number;

    @IsOptional()
    @Type(() => Number)
    height?: number;

    @IsOptional()
    @IsString()
    dimensionUnit?: string;

    @IsOptional()
    @IsString()
    shippingClass?: string;

    // SEO
    @IsOptional()
    @IsString()
    metaTitle?: string;

    @IsOptional()
    @IsString()
    metaDescription?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    metaKeywords?: string[];

    @IsOptional()
    isWholesale?: boolean;

    @IsOptional()
    wholesalePrice?: number;

    @IsOptional()
    moq?: number;

    @IsOptional()
    isActive?: boolean;
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
    @Type(() => Number)
    @IsInt()
    price_min?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    price_max?: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    sort?: string; // 'price_asc', 'price_desc', 'newest'
}
