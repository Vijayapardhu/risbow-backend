import { Module } from '@nestjs/common';
import { VendorStoreController } from './vendor-store.controller';
import { VendorStoreService } from './vendor-store.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadModule } from '../upload/upload.module';

@Module({
    controllers: [VendorStoreController],
    imports: [UploadModule],
    providers: [VendorStoreService, PrismaService],
    exports: [VendorStoreService]
})
export class VendorStoreModule { }
