import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoiceTemplateService } from './invoice-template.service';
import { InvoiceGenerationService } from './invoice-generation.service';
import { InvoicesController } from './invoices.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [InvoicesController],
    providers: [
        InvoicesService, 
        InvoiceTemplateService, 
        InvoiceGenerationService, 
        PrismaService
    ],
    exports: [InvoiceTemplateService, InvoiceGenerationService]
})
export class InvoicesModule {}
