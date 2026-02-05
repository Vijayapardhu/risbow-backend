import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum DocumentType {
  AADHAAR = 'AADHAAR',
  PAN = 'PAN',
  BANK = 'BANK',
  GST = 'GST',
  UPI = 'UPI',
  LICENSE = 'LICENSE',
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
