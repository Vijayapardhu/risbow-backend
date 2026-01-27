import { Module } from '@nestjs/common';
import { VendorDocumentsController } from './vendor-documents.controller';
import { VendorDocumentsService } from './vendor-documents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [VendorDocumentsController],
  providers: [VendorDocumentsService],
  exports: [VendorDocumentsService],
})
export class VendorDocumentsModule {}
