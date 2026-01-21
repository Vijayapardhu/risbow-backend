export declare class CreateProductDto {
    title: string;
    description?: string;
    price: number;
    offerPrice?: number;
    categoryId: string;
    brandName?: string;
    sku?: string;
    stock: number;
    shippingClass?: string;
    weight?: number;
    weightUnit?: string;
    length?: number;
    width?: number;
    height?: number;
    dimensionUnit?: string;
}
export declare class UpdateProductDto {
    title?: string;
    description?: string;
    price?: number;
    offerPrice?: number;
    categoryId?: string;
    brandName?: string;
    sku?: string;
    stock?: number;
    shippingClass?: string;
    weight?: number;
    weightUnit?: string;
    length?: number;
    width?: number;
    height?: number;
    dimensionUnit?: string;
}
export declare class ProductStatusDto {
    isActive: boolean;
}
