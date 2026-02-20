export type GroupedProductBestOfferDto = {
    productId: string;
    vendorId: string;
    vendorName: string;
    price: number;
    offerPrice: number | null;
    effectivePrice: number;
};

export type GroupedProductItemDto = {
    groupKey: string;
    title: string;
    brandName: string | null;
    categoryId: string;
    categoryName: string | null;
    image: string | null;
    minPrice: number;
    maxPrice: number;
    vendorCount: number;
    bestOffer: GroupedProductBestOfferDto | null;
};

export type ProductGroupOffersVendorDto = {
    productId: string;
    vendorId: string;
    vendorName: string;
    price: number;
    offerPrice: number | null;
    effectivePrice: number;
    stock: number | null;
    distanceKm: number | null;
    vendorRatingAvg: number | null;
    vendorRatingCount: number;
    productRatingAvg: number | null;
    productRatingCount: number;
};

export type ProductGroupOffersResponseDto = {
    groupKey: string;
    title: string;
    brandName: string | null;
    categoryId: string;
    categoryName: string | null;
    image: string | null;
    offers: ProductGroupOffersVendorDto[];
};

