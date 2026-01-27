import { IsString, IsEnum } from 'class-validator';

export enum DocumentType {
  AADHAAR = 'AADHAAR',
  PAN = 'PAN',
  BANK = 'BANK',
  GST = 'GST',
  UPI = 'UPI',
}

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;

  // File will be handled by multer
}
