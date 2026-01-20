declare class OrderItemDto {
    productId: string;
    quantity: number;
    vendorId?: string;
}
export declare class CheckoutDto {
    items: OrderItemDto[];
    roomId?: string;
    useCoins?: number;
}
export declare class ConfirmOrderDto {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}
export {};
