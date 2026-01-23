import { Module } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { CoinsModule } from '../coins/coins.module';
import { VendorScoringService } from './vendor-scoring.service';

@Module({
    imports: [CoinsModule],
    controllers: [VendorsController],
    providers: [VendorsService, VendorScoringService],
    exports: [VendorsService, VendorScoringService],
})
export class VendorsModule { }
