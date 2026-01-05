import { Module } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { CoinsModule } from '../coins/coins.module';

@Module({
    imports: [CoinsModule],
    controllers: [VendorsController],
    providers: [VendorsService],
    exports: [VendorsService],
})
export class VendorsModule { }
