import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { MetricsController } from './metrics.controller';
import { BowAdminController } from './bow-admin.controller';
import { BowAdminService } from './bow-admin.service';
import { AdminCommissionController } from './admin-commission.controller';
import { LocalPromotionsController } from './local-promotions.controller';
import { ReferralRewardRulesController } from './referral-reward-rules.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorsModule } from '../vendors/vendors.module';
import { QueuesModule } from '../queues/queues.module';
import { BowModule } from '../bow/bow.module';
import { CategorySpecService } from '../catalog/category-spec.service';
import { CoinsModule } from '../coins/coins.module';
import { CoinValuationController } from './coin-valuation.controller';

@Module({
    imports: [PrismaModule, VendorsModule, QueuesModule, BowModule, CoinsModule],
    controllers: [
        AdminController,
        AdminDashboardController,
        AdminProductController,
        MetricsController,
        BowAdminController,
        AdminCommissionController,
        CoinValuationController,
        LocalPromotionsController,
        ReferralRewardRulesController,
    ],
    providers: [AdminService, AdminDashboardService, AdminProductService, CategorySpecService, BowAdminService],
})
export class AdminModule { }
