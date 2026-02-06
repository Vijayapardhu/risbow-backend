import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsEmail,
    MinLength,
    IsBoolean,
    IsObject,
    IsEnum,
    IsArray,
    ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Document type DTO
export class VendorDocumentUploadDto {
    @ApiProperty({ 
        enum: ['PAN_CARD', 'GST_CERTIFICATE', 'AADHAAR_CARD', 'BANK_STATEMENT', 'CANCELLED_CHEQUE', 'STORE_PHOTO'],
        example: 'PAN_CARD'
    })
    @IsEnum(['PAN_CARD', 'GST_CERTIFICATE', 'AADHAAR_CARD', 'BANK_STATEMENT', 'CANCELLED_CHEQUE', 'STORE_PHOTO'])
    documentType: string;

    @ApiProperty({ type: 'string', format: 'binary', description: 'Document file (PDF, JPG, PNG - Max 5MB)' })
    file: any; // Will be handled by Multer
}

// Step 1: Basic vendor registration with document uploads
export class RegisterVendorWithDocsDto {
    @ApiProperty({ example: 'John Doe' })
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name: string;

    @ApiProperty({ example: 'vendor@risbow.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Password@123' })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: '9876543210' })
    @IsNotEmpty()
    @IsString()
    mobile: string;

    @ApiProperty({ example: 'Super Electronics Store' })
    @IsNotEmpty()
    @IsString()
    storeName: string;

    @ApiProperty({ example: 'ABCDE1234F' })
    @IsNotEmpty()
    @IsString()
    panNumber: string;

    @ApiProperty({ example: false, description: 'Is the vendor GST registered?' })
    @IsBoolean()
    isGstRegistered: boolean;

    @ApiPropertyOptional({ example: '27ABCDE1234F1Z5', description: 'Required if isGstRegistered is true' })
    @IsOptional()
    @IsString()
    gstNumber?: string;

    @ApiProperty({
        example: {
            accountNo: '1234567890',
            ifsc: 'HDFC0001234',
            bankName: 'HDFC Bank',
            holderName: 'John Doe'
        }
    })
    @IsNotEmpty()
    @IsObject()
    bankDetails: {
        accountNo: string;
        ifsc: string;
        bankName: string;
        holderName: string;
    };

    @ApiProperty({
        example: {
            line1: '123 Shop Lane, MG Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001'
        }
    })
    @IsNotEmpty()
    @IsObject()
    pickupAddress: {
        line1: string;
        city: string;
        state: string;
        pincode: string;
    };
}

// Step 2: Payment verification DTO
export class VerifyRegistrationPaymentDto {
    @ApiProperty({ example: 'order_NjYzZmY4ZTU2OGM0' })
    @IsNotEmpty()
    @IsString()
    razorpayOrderId: string;

    @ApiProperty({ example: 'pay_NjYzZmY4ZTU2OGM0' })
    @IsNotEmpty()
    @IsString()
    razorpayPaymentId: string;

    @ApiProperty({ example: 'a1b2c3d4e5f6g7h8i9j0' })
    @IsNotEmpty()
    @IsString()
    razorpaySignature: string;

    @ApiProperty({ example: 'v_123456789' })
    @IsNotEmpty()
    @IsString()
    vendorId: string;
}

// Response DTOs
export class RegistrationPaymentOrderResponseDto {
    @ApiProperty()
    orderId: string;

    @ApiProperty()
    amount: number;

    @ApiProperty()
    currency: string;

    @ApiProperty()
    keyId: string;

    @ApiProperty()
    vendorId: string;

    @ApiProperty()
    vendorName: string;
}

export class VendorRegistrationResponseDto {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    message: string;

    @ApiProperty()
    vendorId: string;

    @ApiProperty()
    requiresPayment: boolean;

    @ApiProperty({ required: false })
    paymentOrder?: RegistrationPaymentOrderResponseDto;

    @ApiProperty({ required: false })
    accessToken?: string;

    @ApiProperty({ required: false })
    refreshToken?: string;
}

export class DocumentUploadResponseDto {
    @ApiProperty()
    documentId: string;

    @ApiProperty()
    documentType: string;

    @ApiProperty()
    documentUrl: string;

    @ApiProperty()
    status: string;

    @ApiProperty()
    uploadedAt: Date;
}
