import { Module } from '@nestjs/common';
import { VendorReturnsController } from './vendor-returns.controller';
import { VendorReturnsService } from './vendor-returns.service';

@Module({
    controllers: [VendorReturnsController],
    providers: [VendorReturnsService],
    exports: [VendorReturnsService],
})
export class VendorReturnsModule { }
