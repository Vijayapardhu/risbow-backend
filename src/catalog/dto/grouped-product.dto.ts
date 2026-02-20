import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BestOfferDto {
    @ApiProperty({ description: 'Product ID of the best offer' })
    productId: string;

    @ApiProperty({ description: 'Vendor ID' })
    vendorId: string;

    @ApiProperty({ description: 'Vendor name' })
    vendorName: string;

    @ApiProperty({ description: 'Original price in paise' })
    price: number;

    @ApiPropertyOptional({ description: 'Offer price in paise' })
    offerPrice: number | null;

    @ApiProperty({ description: 'Available stock' })
    stock: number;
}

export class GroupedProductDto {
    @ApiProperty({ description: 'Unique group key for deduplication' })
    groupKey: string;

    @ApiProperty({ description: 'Product title' })
    title: string;

    @ApiPropertyOptional({ description: 'Brand name' })
    brandName: string | null;

    @ApiPropertyOptional({ description: 'Category name' })
    category: string | null;

    @ApiPropertyOptional({ description: 'Category ID' })
    categoryId: string | null;

    @ApiPropertyOptional({ description: 'Best image URL from the group' })
    image: string | null;

    @ApiProperty({ description: 'Minimum effective price in paise' })
    minPrice: number;

    @ApiProperty({ description: 'Maximum effective price in paise' })
    maxPrice: number;

    @ApiProperty({ description: 'Number of vendors offering this product' })
    vendorCount: number;

    @ApiPropertyOptional({ description: 'Best offer details' })
    bestOffer: BestOfferDto | null;
}

export class GroupedProductResponseDto {
    @ApiProperty({ type: [GroupedProductDto] })
    items: GroupedProductDto[];

    @ApiProperty()
    meta: {
        total: number;
        grouped: boolean;
    };
}
