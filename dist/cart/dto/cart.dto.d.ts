export declare class AddCartItemDto {
    productId: string;
    variantId?: string;
    quantity: number;
}
export declare class UpdateCartItemDto {
    quantity: number;
}
export declare class SyncCartItemDto {
    productId: string;
    variantId?: string;
    quantity: number;
}
export declare class SyncCartDto {
    items: SyncCartItemDto[];
}
