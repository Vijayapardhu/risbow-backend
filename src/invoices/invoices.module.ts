import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [InvoicesController],
    providers: [InvoicesService, PrismaService],
})
export class InvoicesModule {}
