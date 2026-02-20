import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class BulkUploadProductDto {
    @IsNotEmpty({ message: 'Title is required' })
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNotEmpty({ message: 'Price is required' })
    @Transform(({ value }) => parseFloat(value))
    price: number;

    @IsOptional()
    @Transform(({ value }) => parseFloat(value))
    offerPrice?: number;

    @IsNotEmpty({ message: 'Category ID is required' })
    categoryId: string;

    @IsNotEmpty({ message: 'SKU is required' })
    sku: string;

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsNotEmpty({ message: 'Stock is required' })
    @Transform(({ value }) => parseInt(value))
    stock: number;

    @IsString()
    @IsOptional()
    brandName?: string;

    @IsString()
    @IsOptional()
    storeName?: string; // Optional override
}
