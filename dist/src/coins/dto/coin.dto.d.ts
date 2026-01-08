export declare enum CoinSource {
    REFERRAL = "REFERRAL",
    ORDER_REWARD = "ORDER_REWARD",
    ADMIN_CREDIT = "ADMIN_CREDIT",
    SPEND_ORDER = "SPEND_ORDER",
    BANNER_PURCHASE = "BANNER_PURCHASE"
}
export declare class CreditCoinDto {
    userId: string;
    amount: number;
    source: CoinSource;
}
export declare class DebitCoinDto {
    userId: string;
    amount: number;
    source: CoinSource;
}
