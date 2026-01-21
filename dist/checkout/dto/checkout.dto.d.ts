export declare enum PaymentMode {
    COD = "COD",
    ONLINE = "ONLINE"
}
export declare class CheckoutDto {
    paymentMode: PaymentMode;
    shippingAddressId: string;
    notes?: string;
    giftId?: string;
    couponCode?: string;
}
