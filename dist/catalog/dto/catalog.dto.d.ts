export declare class CreateProductDto {
    title: string;
    description?: string;
    price: number;
    offerPrice?: number;
    categoryId: string;
    stock?: number;
    vendorId?: string;
    isWholesale?: boolean;
    wholesalePrice?: number;
    moq?: number;
}
export declare class ProductFilterDto {
    category?: string;
    price_lt?: number;
    search?: string;
}
