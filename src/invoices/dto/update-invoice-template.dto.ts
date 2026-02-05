import { PartialType } from '@nestjs/swagger';
import { CreateInvoiceTemplateDto } from './create-invoice-template.dto';

export class UpdateInvoiceTemplateDto extends PartialType(CreateInvoiceTemplateDto) {}
