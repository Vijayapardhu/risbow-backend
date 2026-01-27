import { Module, forwardRef } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { VendorDisciplineController } from './vendor-discipline.controller';
import { VendorBowCoinLedgerController } from './vendor-bow-coin-ledger.controller';
import { CoinsModule } from '../coins/coins.module';
import { VendorScoringService } from './vendor-scoring.service';
import { VendorRevenueService } from './vendor-revenue.service';
import { PromotionsService } from './promotions.service';
import { PaymentsModule } from '../payments/payments.module';
import { VendorAvailabilityService } from './vendor-availability.service';
import { VendorDisciplineService } from './vendor-discipline.service';
import { VendorBowCoinLedgerService } from './vendor-bow-coin-ledger.service';

@Module({
    imports: [CoinsModule, forwardRef(() => PaymentsModule)],
    controllers: [
        VendorsController,
        VendorDisciplineController,
        VendorBowCoinLedgerController,
    ],
    providers: [
        VendorsService,
        VendorScoringService,
        VendorRevenueService,
        PromotionsService,
        VendorAvailabilityService,
        VendorDisciplineService,
        VendorBowCoinLedgerService,
    ],
    exports: [
        VendorsService,
        VendorScoringService,
        VendorRevenueService,
        PromotionsService,
        VendorAvailabilityService,
        VendorDisciplineService,
        VendorBowCoinLedgerService,
    ],
})
export class VendorsModule { }
