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
import { AdminSettingsController } from './admin-settings.controller';
import { LocalPromotionsController } from './local-promotions.controller';
import { ReferralRewardRulesController } from './referral-reward-rules.controller';
import { AdminRoomsController } from './admin-rooms.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { AdminVendorsController } from './admin-vendors.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorsModule } from '../vendors/vendors.module';
import { BowModule } from '../bow/bow.module';
import { CategorySpecService } from '../catalog/category-spec.service';
import { CoinsModule } from '../coins/coins.module';
import { CoinValuationController } from './coin-valuation.controller';
import { OrdersModule } from '../orders/orders.module';
import { TelecallerModule } from '../telecaller/telecaller.module';
import { AdminRecoveryController } from './admin-recovery.controller';
import { QueuesProviderModule } from '../queues/queues-provider.module';
import { AdminCampaignsController } from './admin-campaigns.controller';
import { CampaignsService } from './campaigns.service';

// New Admin Modules (Opus 4.5 Implementation)
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminRbacModule } from './rbac/admin-rbac.module';
import { AdminAuditModule } from './audit/admin-audit.module';
import { VendorStrikeModule } from './strikes/vendor-strike.module';
import { BowCoinModule } from './coins/bow-coin.module';
import { BannerCampaignModule } from './banners/banner-campaign.module';
import { ContentModerationModule } from './moderation/content-moderation.module';
import { ReportingModule } from './reports/reporting.module';

/**
 * Main Admin Module
 * 
 * This module aggregates all admin-specific modules for the RisBow Admin Panel.
 * 
 * New Modules (Opus 4.5):
 * - AdminAuthModule: Enhanced authentication with MFA, session management
 * - AdminRbacModule: Role-based access control with 60+ permissions
 * - AdminAuditModule: Comprehensive audit logging for compliance
 * - VendorStrikeModule: Vendor discipline and strike management
 * - BowCoinModule: Loyalty coin economy engine
 * - BannerCampaignModule: Advertising campaign management
 * - ContentModerationModule: Content review and moderation queue
 * - ReportingModule: Dashboard analytics and report generation
 * 
 * Security Hierarchy:
 * SUPER_ADMIN > ADMIN > MODERATOR > SUPPORT > ANALYST
 */
@Module({
    imports: [
        // Core modules
        PrismaModule,
        VendorsModule,
        BowModule,
        CoinsModule,
        OrdersModule,
        TelecallerModule,
        QueuesProviderModule.forRoot(),

        // New Admin Security & Business Logic Modules
        AdminAuthModule,
        AdminRbacModule,
        AdminAuditModule,
        VendorStrikeModule,
        BowCoinModule,
        BannerCampaignModule,
        ContentModerationModule,
        ReportingModule,
    ],
    controllers: [
        AdminController,
        AdminDashboardController,
        AdminProductController,
        MetricsController,
        BowAdminController,
        AdminCommissionController,
        AdminSettingsController,
        AdminRecoveryController,
        CoinValuationController,
        LocalPromotionsController,
        ReferralRewardRulesController,
        AdminRoomsController,
        AdminSubscriptionsController,
        AdminCampaignsController,
        AdminVendorsController,
    ],
    providers: [
        AdminService,
        AdminDashboardService,
        AdminProductService,
        CategorySpecService,
        BowAdminService,
        CampaignsService,
    ],
    exports: [
        // Export new modules for use in other parts of the application
        AdminAuthModule,
        AdminRbacModule,
        AdminAuditModule,
        VendorStrikeModule,
        BowCoinModule,
        BannerCampaignModule,
        ContentModerationModule,
        ReportingModule,
    ],
})
export class AdminModule {}
