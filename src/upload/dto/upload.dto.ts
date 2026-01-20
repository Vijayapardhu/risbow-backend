import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UploadContext {
    PRODUCT = 'products',
    VENDOR = 'vendors',
    BANNER = 'banners',
    // DOCUMENTS context is handled separately or can be added here if needed
}

export enum DocumentType {
    KYC = 'KYC',
    RETURN_PROOF = 'RETURN_PROOF',
    OTHER = 'OTHER'
}

export class SingleImageUploadDto {
    @ApiProperty({ enum: UploadContext, example: UploadContext.PRODUCT })
    @IsEnum(UploadContext)
    @IsNotEmpty()
    context: UploadContext;

    @ApiProperty({ example: 'uuid-of-entity', description: 'ID of the product/vendor/banner' })
    @IsUUID()
    @IsNotEmpty()
    contextId: string;
}

export class MultipleImageUploadDto {
    @ApiProperty({ enum: UploadContext, example: UploadContext.PRODUCT })
    @IsEnum(UploadContext)
    @IsNotEmpty()
    context: UploadContext;

    @ApiProperty({ example: 'uuid-of-entity' })
    @IsUUID()
    @IsNotEmpty()
    contextId: string;
}

export class DocumentUploadDto {
    @ApiProperty({ enum: DocumentType, example: DocumentType.KYC })
    @IsEnum(DocumentType)
    @IsNotEmpty()
    documentType: DocumentType;
}
