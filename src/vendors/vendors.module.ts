import { Module, forwardRef } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { VendorDisciplineController } from './vendor-discipline.controller';
import { VendorBowCoinLedgerController } from './vendor-bow-coin-ledger.controller';
import { VendorProductsController } from './vendor-products.controller';
import { VendorProductsAliasController } from './vendor-products-alias.controller';
import { VendorProductVariantsController } from './vendor-product-variants.controller';
import { VendorOrdersController } from './vendor-orders.controller';
import { VendorPayoutsController, VendorBankDetailsController } from './vendor-payouts.controller';
import { VendorInventoryController } from './vendor-inventory.controller';
import { VendorProfileController } from './vendor-profile.controller';
import { VendorReturnsController } from './vendor-returns.controller';
import { VendorCouponsController } from './vendor-coupons.controller';
import { VendorCouponsAliasController } from './vendor-coupons-alias.controller';
import { VendorNotificationsController } from './vendor-notifications.controller';
import { VendorDashboardController, VendorAnalyticsController, VendorReviewsController, VendorCustomersController } from './vendor-dashboard.controller';
import { VendorCampaignsController } from './vendor-campaigns.controller';
import { CoinsModule } from '../coins/coins.module';
import { VendorScoringService } from './vendor-scoring.service';
import { VendorRevenueService } from './vendor-revenue.service';
import { PromotionsService } from './promotions.service';
import { PaymentsModule } from '../payments/payments.module';
import { VendorAvailabilityService } from './vendor-availability.service';
import { VendorDisciplineService } from './vendor-discipline.service';
import { VendorBowCoinLedgerService } from './vendor-bow-coin-ledger.service';
import { VendorProductsService } from './vendor-products.service';
import { VendorProductVariantsService } from './vendor-product-variants.service';
import { VendorOrdersService } from './vendor-orders.service';
import { VendorPayoutsService } from './vendor-payouts.service';
import { VendorInventoryService } from './vendor-inventory.service';
import { VendorProfileService } from './vendor-profile.service';
import { VendorReturnsService } from './vendor-returns.service';
import { VendorCouponsService } from './vendor-coupons.service';
import { VendorNotificationsService } from './vendor-notifications.service';
import { VendorReportsController } from './vendor-reports.controller';
import { VendorReportsService } from './vendor-reports.service';


@Module({
    imports: [CoinsModule, forwardRef(() => PaymentsModule)],
    controllers: [
        VendorsController,
        VendorDisciplineController,
        VendorBowCoinLedgerController,
        VendorProductsController,
        VendorProductsAliasController,
        VendorProductVariantsController,
        VendorOrdersController,
        VendorPayoutsController,
        VendorBankDetailsController,
        VendorInventoryController,
        VendorProfileController,
        VendorReturnsController,
        VendorCouponsController,
        VendorCouponsAliasController,
        VendorNotificationsController,
        VendorReportsController,
        VendorDashboardController,
        VendorAnalyticsController,
        VendorReviewsController,
        VendorCustomersController,
        VendorCampaignsController,
    ],
    providers: [
        VendorsService,
        VendorScoringService,
        VendorRevenueService,
        PromotionsService,
        VendorAvailabilityService,
        VendorDisciplineService,
        VendorBowCoinLedgerService,
        VendorProductsService,
        VendorProductVariantsService,
        VendorOrdersService,
        VendorPayoutsService,
        VendorInventoryService,
        VendorProfileService,
        VendorReturnsService,
        VendorCouponsService,
        VendorNotificationsService,
        VendorReportsService,
    ],
    exports: [
        VendorsService,
        VendorScoringService,
        VendorRevenueService,
        PromotionsService,
        VendorAvailabilityService,
        VendorDisciplineService,
        VendorBowCoinLedgerService,
        VendorProductsService,
        VendorOrdersService,
        VendorPayoutsService,
        VendorInventoryService,
        VendorProfileService,
        VendorReturnsService,
        VendorCouponsService,
        VendorNotificationsService,
        VendorReportsService,
    ],
})
export class VendorsModule { }
