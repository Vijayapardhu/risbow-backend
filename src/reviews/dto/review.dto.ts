import { IsInt, IsString, IsOptional, Min, Max, IsArray, IsUrl, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
    @ApiProperty({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5, example: 5 })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({ description: 'Review comment', maxLength: 2000, example: 'Great product!' })
    @IsOptional()
    @IsString()
    @Length(1, 2000)
    comment?: string;

    @ApiPropertyOptional({ description: 'Array of image URLs', type: [String], example: ['https://example.com/img.jpg'] })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    images?: string[];
}

export class UpdateReviewDto {
    @ApiPropertyOptional({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @ApiPropertyOptional({ description: 'Review comment', maxLength: 2000 })
    @IsOptional()
    @IsString()
    @Length(1, 2000)
    comment?: string;
}

export class ReportReviewDto {
    @ApiProperty({ description: 'Reason for reporting', example: 'Inappropriate content' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiPropertyOptional({ description: 'Additional details', example: 'Contains spam link' })
    @IsOptional()
    @IsString()
    details?: string;
}
