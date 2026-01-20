export declare enum ProductVisibility {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    BLOCKED = "BLOCKED"
}
export declare enum VariationStatus {
    ACTIVE = "ACTIVE",
    OUT_OF_STOCK = "OUT_OF_STOCK",
    ARCHIVED = "ARCHIVED"
}
export declare enum MediaType {
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    GIF = "GIF"
}
export declare class MediaDto {
    id?: string;
    type: MediaType;
    url: string;
    priority?: number;
}
export declare class CreateVariationDto {
    sku?: string;
    attributes: any;
    mrp: number;
    sellingPrice: number;
    stock?: number;
    status?: VariationStatus;
    weight?: number;
    dimensions?: any;
    mediaOverrides?: MediaDto[];
}
export declare class CreateProductDto {
    title: string;
    description?: string;
    price: number;
    offerPrice?: number;
    categoryId: string;
    stock?: number;
    vendorId?: string;
    visibility?: ProductVisibility;
    defaultVariationId?: string;
    mediaGallery?: MediaDto[];
    variations?: CreateVariationDto[];
    attributes?: any;
    images?: string[];
    sku?: string;
    brandName?: string;
    tags?: string[];
    weight?: number;
    weightUnit?: string;
    length?: number;
    width?: number;
    height?: number;
    dimensionUnit?: string;
    shippingClass?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    isWholesale?: boolean;
    wholesalePrice?: number;
    moq?: number;
    isActive?: boolean;
    isCancelable?: boolean;
    isReturnable?: boolean;
    requiresOTP?: boolean;
    isInclusiveTax?: boolean;
    isAttachmentRequired?: boolean;
    minOrderQuantity?: number;
    quantityStepSize?: number;
    totalAllowedQuantity?: number;
    basePreparationTime?: number;
    storageInstructions?: string;
    allergenInformation?: string;
    specs?: Array<{
        specId: string;
        value: string;
    }>;
    costPrice?: number;
    rulesSnapshot?: any;
    shippingDetails?: any;
}
export declare class UpdateProductDto {
    title?: string;
    description?: string;
    price?: number;
    offerPrice?: number;
    categoryId?: string;
    stock?: number;
    vendorId?: string;
    visibility?: ProductVisibility;
    defaultVariationId?: string;
    mediaGallery?: MediaDto[];
    attributes?: any;
    sku?: string;
    images?: string[];
    brandName?: string;
    tags?: string[];
    weight?: number;
    weightUnit?: string;
    length?: number;
    width?: number;
    height?: number;
    dimensionUnit?: string;
    shippingClass?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    isWholesale?: boolean;
    wholesalePrice?: number;
    moq?: number;
    isActive?: boolean;
    isCancelable?: boolean;
    isReturnable?: boolean;
    requiresOTP?: boolean;
    isInclusiveTax?: boolean;
    isAttachmentRequired?: boolean;
    minOrderQuantity?: number;
    quantityStepSize?: number;
    totalAllowedQuantity?: number;
    basePreparationTime?: number;
    storageInstructions?: string;
    allergenInformation?: string;
    specs?: Array<{
        specId: string;
        value: string;
    }>;
    variants?: any;
    costPrice?: number;
    rulesSnapshot?: any;
    shippingDetails?: any;
}
export declare class ProductFilterDto {
    category?: string;
    price_lt?: number;
    price_min?: number;
    price_max?: number;
    search?: string;
    sort?: string;
}
