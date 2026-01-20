
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

    // Fulfillment & Compliance
    @IsOptional()
    isCancelable?: boolean;

    @IsOptional()
    isReturnable?: boolean;

    @IsOptional()
    requiresOTP?: boolean;

    @IsOptional()
    isInclusiveTax?: boolean;

    @IsOptional()
    isAttachmentRequired?: boolean;

    // Order Constraints
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    minOrderQuantity?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    quantityStepSize?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    totalAllowedQuantity?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    basePreparationTime?: number;

    // Content
    @IsOptional()
    @IsString()
    storageInstructions?: string;

    @IsOptional()
    @IsString()
    allergenInformation?: string;

    // Dynamic Specifications
    @IsOptional()
    @IsArray()
    specs?: Array<{ specId: string; value: string }>;

    // Enterprise V2 Fields (Phase 8)
    @IsOptional()
    attributes?: any; // JSONB

    @IsOptional()
    @IsInt()
    @Min(0)
    costPrice?: number;

    @IsOptional()
    rulesSnapshot?: any; // JSONB

    @IsOptional()
    shippingDetails?: any; // JSONB

    @IsOptional()
    mediaGallery?: any; // JSONB

    @IsOptional()
    variants?: any; // JSONB
}

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    offerPrice?: number;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsInt()
    stock?: number;

    @IsOptional()
    @IsString()
    vendorId?: string;

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

    // Fulfillment & Compliance
    @IsOptional()
    isCancelable?: boolean;

    @IsOptional()
    isReturnable?: boolean;

    @IsOptional()
    requiresOTP?: boolean;

    @IsOptional()
    isInclusiveTax?: boolean;

    @IsOptional()
    isAttachmentRequired?: boolean;

    // Order Constraints
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    minOrderQuantity?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    quantityStepSize?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    totalAllowedQuantity?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    basePreparationTime?: number;

    // Content
    @IsOptional()
    @IsString()
    storageInstructions?: string;

    @IsOptional()
    @IsString()
    allergenInformation?: string;

    // Dynamic Specifications
    @IsOptional()
    @IsArray()
    specs?: Array<{ specId: string; value: string }>;

    @IsOptional()
    variants?: any;

    // Enterprise V2 Fields (Phase 8)
    @IsOptional()
    attributes?: any; // JSONB

    @IsOptional()
    @IsInt()
    @Min(0)
    costPrice?: number;

    @IsOptional()
    rulesSnapshot?: any; // JSONB

    @IsOptional()
    shippingDetails?: any; // JSONB

    @IsOptional()
    mediaGallery?: any; // JSONB
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
