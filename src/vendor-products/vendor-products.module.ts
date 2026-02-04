import { Module } from '@nestjs/common';
import { VendorProductsController } from './vendor-products.controller';
import { VendorProductsService } from './vendor-products.service';
import { PrismaService } from '../prisma/prisma.service';

import { UploadModule } from '../upload/upload.module';

@Module({
    imports: [UploadModule],
    controllers: [VendorProductsController],
    providers: [VendorProductsService, PrismaService],
    exports: [VendorProductsService]
})
export class VendorProductsModule { }
