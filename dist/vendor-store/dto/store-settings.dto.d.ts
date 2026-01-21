export declare class DayTimingDto {
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
}
export declare class UpdateStoreProfileDto {
    storeName?: string;
    storeLogo?: string;
    storeBanner?: string;
}
export declare class UpdateStoreTimingsDto {
    timings: DayTimingDto[];
}
export declare class UpdatePickupSettingsDto {
    pickupEnabled: boolean;
    pickupTimings?: DayTimingDto[];
}
