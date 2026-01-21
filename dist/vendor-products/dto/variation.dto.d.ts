export declare enum VariationStatus {
    ACTIVE = "ACTIVE",
    OUT_OF_STOCK = "OUT_OF_STOCK"
}
export declare class VariationAttributesDto {
    size?: string;
    color?: string;
    material?: string;
    style?: string;
}
export declare class VariationDto {
    id?: string;
    attributes: VariationAttributesDto;
    price: number;
    offerPrice?: number;
    stock: number;
    status: VariationStatus;
}
