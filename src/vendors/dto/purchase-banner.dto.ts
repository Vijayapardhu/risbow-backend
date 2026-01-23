import { IsString, IsUrl, IsEnum, IsDateString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BannerSlotType {
    HOME = 'HOME',
    CATEGORY = 'CATEGORY',
    SEARCH = 'SEARCH',
}

export class PurchaseBannerDto {
    @ApiProperty({ description: 'The URL of the banner image' })
    @IsUrl()
    imageUrl: string;

    @ApiPropertyOptional({ description: 'Optional redirect URL when clicked' })
    @IsOptional()
    @IsUrl()
    redirectUrl?: string;

    @ApiProperty({ enum: BannerSlotType, description: 'Where the banner will be displayed' })
    @IsEnum(BannerSlotType)
    slotType: BannerSlotType;

    @ApiProperty({ description: 'Start date for the promotion' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'End date for the promotion' })
    @IsDateString()
    endDate: string;

    @ApiProperty({ description: 'Cost in coins for this banner slot' })
    @IsInt()
    @Min(1)
    coinsCost: number;
}
