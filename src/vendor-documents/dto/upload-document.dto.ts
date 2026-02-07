import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum DocumentType {
  AADHAAR_CARD = 'AADHAAR_CARD',
  PAN_CARD = 'PAN_CARD',
  BANK_STATEMENT = 'BANK_STATEMENT',
  GST_CERTIFICATE = 'GST_CERTIFICATE',
  CANCELLED_CHEQUE = 'CANCELLED_CHEQUE',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  STORE_PHOTO = 'STORE_PHOTO',
  PASSPORT = 'PASSPORT',
  OTHER = 'OTHER',
}

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;

  // File will be handled by multer
}

export class RejectDocumentDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
