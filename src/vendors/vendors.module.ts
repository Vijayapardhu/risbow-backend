import { Module, forwardRef } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { CoinsModule } from '../coins/coins.module';
import { VendorScoringService } from './vendor-scoring.service';
import { VendorRevenueService } from './vendor-revenue.service';
import { PromotionsService } from './promotions.service';
import { PaymentsModule } from '../payments/payments.module';
import { VendorAvailabilityService } from './vendor-availability.service';

@Module({
    imports: [CoinsModule, forwardRef(() => PaymentsModule)],
    controllers: [VendorsController],
    providers: [VendorsService, VendorScoringService, VendorRevenueService, PromotionsService, VendorAvailabilityService],
    exports: [VendorsService, VendorScoringService, VendorRevenueService, PromotionsService, VendorAvailabilityService],
})
export class VendorsModule { }
