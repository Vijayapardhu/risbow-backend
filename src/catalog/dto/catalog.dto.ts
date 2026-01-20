import { IsInt, IsNotEmpty, IsOptional, IsString, Min, IsArray, IsEnum, ValidateNested, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductVisibility {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    BLOCKED = 'BLOCKED'
}

export enum VariationStatus {
    ACTIVE = 'ACTIVE',
    OUT_OF_STOCK = 'OUT_OF_STOCK',
    ARCHIVED = 'ARCHIVED'
}

export enum MediaType {
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    GIF = 'GIF'
}

export class MediaDto {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    @IsEnum(MediaType)
    type: MediaType;

    @IsNotEmpty()
    @IsString()
    url: string;

    @IsOptional()
    @IsInt()
    priority?: number;
}

export class CreateVariationDto {
    @IsOptional()
    @IsString()
    sku?: string;

    @IsNotEmpty()
    attributes: any; // JSON: { size: "M", color: "Red" }

    @IsNotEmpty()
    @IsInt()
    @Min(0)
    mrp: number;

    @IsNotEmpty()
    @IsInt()
    @Min(0)
    sellingPrice: number;

    @IsOptional()
    @IsInt()
    stock?: number;

    @IsOptional()
    @IsEnum(VariationStatus)
    status?: VariationStatus;

    @IsOptional()
    @IsNumber()
    weight?: number;

    @IsOptional()
    dimensions?: any; // JSON

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MediaDto)
    mediaOverrides?: MediaDto[];
}

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
    price: number; // Display Price / Starting Price

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
    vendorId?: string;

    @IsOptional()
    @IsEnum(ProductVisibility)
    visibility?: ProductVisibility;

    @IsOptional()
    @IsString()
    defaultVariationId?: string; // If creating simultaneously, logic handles this, usually undefined on create

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MediaDto)
    mediaGallery?: MediaDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateVariationDto)
    variations?: CreateVariationDto[];

    @IsOptional()
    attributes?: any; // Product-scope attributes

    // --- Legacy / Back-Compat Fields ---
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @IsString()
    sku?: string;

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
    @IsBoolean()
    isWholesale?: boolean;

    @IsOptional()
    @IsNumber()
    wholesalePrice?: number;

    @IsOptional()
    @IsInt()
    moq?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    // Fulfillment & Compliance
    @IsOptional()
    @IsBoolean()
    isCancelable?: boolean;

    @IsOptional()
    @IsBoolean()
    isReturnable?: boolean;

    @IsOptional()
    @IsBoolean()
    requiresOTP?: boolean;

    @IsOptional()
    @IsBoolean()
    isInclusiveTax?: boolean;

    @IsOptional()
    @IsBoolean()
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

    // Dynamic Specifications (Legacy V1)
    @IsOptional()
    @IsArray()
    specs?: Array<{ specId: string; value: string }>;

    @IsOptional()
    @IsInt()
    @Min(0)
    costPrice?: number;

    @IsOptional()
    rulesSnapshot?: any;

    @IsOptional()
    shippingDetails?: any;
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
    @IsEnum(ProductVisibility)
    visibility?: ProductVisibility;

    @IsOptional()
    @IsString()
    defaultVariationId?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MediaDto)
    mediaGallery?: MediaDto[];

    @IsOptional()
    attributes?: any;

    // --- Legacy Fields ---
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

    @IsOptional()
    @IsString()
    storageInstructions?: string;

    @IsOptional()
    @IsString()
    allergenInformation?: string;

    @IsOptional()
    @IsArray()
    specs?: Array<{ specId: string; value: string }>;

    @IsOptional()
    variants?: any; // For backward compat or raw update

    @IsOptional()
    @IsInt()
    @Min(0)
    costPrice?: number;

    @IsOptional()
    rulesSnapshot?: any;

    @IsOptional()
    shippingDetails?: any;
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
