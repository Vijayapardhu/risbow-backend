import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsEmail, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TaxFieldDto {
    @ApiProperty({ example: 'CGST' })
    @IsString()
    name: string;

    @ApiProperty({ example: 9 })
    rate: number;

    @ApiProperty({ example: 'percentage' })
    @IsString()
    type: string;
}

export class CustomFieldDto {
    @ApiProperty({ example: 'PAN Number' })
    @IsString()
    fieldName: string;

    @ApiProperty({ example: 'ABCDE1234F' })
    @IsString()
    fieldValue: string;

    @ApiProperty({ example: 1 })
    displayOrder: number;
}

export class CreateInvoiceTemplateDto {
    @ApiProperty({ example: 'Default Template' })
    @IsString()
    @IsNotEmpty()
    templateName: string;

    @ApiProperty({ example: 'https://example.com/logo.png', required: false })
    @IsOptional()
    @IsString()
    logoUrl?: string;

    @ApiProperty({ example: 'My Store Pvt Ltd' })
    @IsString()
    @IsNotEmpty()
    companyName: string;

    @ApiProperty({ example: '123 Main Street, Bangalore, Karnataka - 560001', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: '+91 9876543210', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: 'store@example.com', required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ example: '29AABCU9603R1ZM', required: false })
    @IsOptional()
    @IsString()
    gstin?: string;

    @ApiProperty({ 
        example: { fields: [{ name: 'CGST', rate: 9, type: 'percentage' }, { name: 'SGST', rate: 9, type: 'percentage' }] }, 
        required: false 
    })
    @IsOptional()
    taxFields?: { fields: TaxFieldDto[] };

    @ApiProperty({ example: 'Thank you for your business!', required: false })
    @IsOptional()
    @IsString()
    headerText?: string;

    @ApiProperty({ example: 'Terms: Payment due within 30 days', required: false })
    @IsOptional()
    @IsString()
    footerText?: string;

    @ApiProperty({ example: true, default: true })
    @IsOptional()
    @IsBoolean()
    showQrCode?: boolean;

    @ApiProperty({ example: 'INR', default: 'INR' })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiProperty({ example: 'en-IN', default: 'en-IN' })
    @IsOptional()
    @IsString()
    locale?: string;

    @ApiProperty({ example: false, default: false })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;

    @ApiProperty({ type: [CustomFieldDto], required: false })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomFieldDto)
    customFields?: CustomFieldDto[];
}
