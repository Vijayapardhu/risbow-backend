import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VendorOfferDto {
    @ApiProperty({ description: 'Product ID' })
    productId: string;

    @ApiProperty({ description: 'Vendor ID' })
    vendorId: string;

    @ApiProperty({ description: 'Vendor display name' })
    vendorName: string;

    @ApiPropertyOptional({ description: 'Vendor store name' })
    storeName?: string;

    @ApiProperty({ description: 'Original price in paise' })
    price: number;

    @ApiPropertyOptional({ description: 'Offer price in paise' })
    offerPrice: number | null;

    @ApiProperty({ description: 'Effective price (offer or original) in paise' })
    effectivePrice: number;

    @ApiProperty({ description: 'Available stock' })
    stock: number;

    @ApiProperty({ description: 'Whether the product is active' })
    isActive: boolean;

    @ApiPropertyOptional({ description: 'Distance from user in kilometers' })
    distanceKm?: number;

    @ApiPropertyOptional({ description: 'Average vendor rating' })
    vendorRatingAvg?: number;

    @ApiPropertyOptional({ description: 'Number of vendor ratings' })
    vendorRatingCount?: number;

    @ApiPropertyOptional({ description: 'Average product rating' })
    productRatingAvg?: number;

    @ApiPropertyOptional({ description: 'Number of product ratings' })
    productRatingCount?: number;
}

export class GroupSummaryDto {
    @ApiProperty({ description: 'Group key' })
    groupKey: string;

    @ApiProperty({ description: 'Product title' })
    title: string;

    @ApiPropertyOptional({ description: 'Best image URL' })
    image: string | null;
}

export class GroupOffersResponseDto {
    @ApiProperty({ type: GroupSummaryDto })
    group: GroupSummaryDto;

    @ApiProperty({ type: [VendorOfferDto] })
    offers: VendorOfferDto[];

    @ApiProperty()
    meta: {
        total: number;
    };
}

export class GroupOffersQueryDto {
    lat?: number;
    lng?: number;
}
