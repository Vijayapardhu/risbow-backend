import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoinsModule } from './coins/coins.module';
import { RoomsModule } from './rooms/rooms.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { VendorsModule } from './vendors/vendors.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { BowModule } from './bow/bow.module';
import { CheckoutModule } from './checkout/checkout.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsModule } from './analytics/analytics.module';
import { TelecallerModule } from './telecaller/telecaller.module';
import { ReturnsModule } from './returns/returns.module';
import { CartModule } from './cart/cart.module';
import { VendorOrdersModule } from './vendor-orders/vendor-orders.module';
import { InventoryModule } from './inventory/inventory.module';

import { UploadModule } from './upload/upload.module';
import { ReviewsModule } from './reviews/reviews.module';
import { GiftsModule } from './gifts/gifts.module';
import { CouponsModule } from './coupons/coupons.module';
import { BannersModule } from './banners/banners.module';
import { QueuesProviderModule } from './queues/queues-provider.module';
import { VendorMembershipsModule } from './vendor-memberships/vendor-memberships.module';
import { VendorStoreModule } from './vendor-store/vendor-store.module';
import { VendorProductsModule } from './vendor-products/vendor-products.module';
import { VendorPayoutsModule } from './vendor-payouts/vendor-payouts.module';
import { VendorFollowersModule } from './vendor-followers/vendor-followers.module';
import { SearchModule } from './search/search.module';
import { WalletModule } from './wallet/wallet.module';
import { BetModule } from './bet/bet.module';
import { WholesalersModule } from './wholesalers/wholesalers.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { MetricsModule } from './metrics/metrics.module';
import { StoriesModule } from './stories/stories.module';
import { ReelsModule } from './reels/reels.module';
import { CreatorsModule } from './creators/creators.module';
import { ClearanceModule } from './clearance/clearance.module';
import { VendorDocumentsModule } from './vendor-documents/vendor-documents.module';
import { ContentModerationModule } from './moderation/content-moderation.module';
import { BannerCampaignsModule } from './banner-campaigns/banner-campaigns.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CampaignsModule } from './campaigns/campaigns.module';

// New Modules
import { RefundsModule } from './refunds/refunds.module';
import { SupportModule } from './support/support.module';
import { EmployeesModule } from './employees/employees.module';
import { DriversModule } from './drivers/drivers.module';
import { CmsModule } from './cms/cms.module';
import { BlogModule } from './blog/blog.module';
import { NotificationsAdminModule } from './notifications-admin/notifications-admin.module';

import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { SharedModule } from './shared/shared.module';
import { CommonModule } from './common/common.module';
import { HealthController } from './common/health.controller';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        ThrottlerModule.forRoot([{
            ttl: parseInt(process.env.THROTTLE_TTL) || 60000,
            limit: parseInt(process.env.THROTTLE_LIMIT) || 500,
        }]),
        // Redis & Queues - Bull when Redis enabled; QueuesProviderModule always (stub or real)
        ...(process.env.NODE_ENV === 'test' || !process.env.REDIS_HOST || process.env.DISABLE_REDIS === 'true' || process.env.DISABLE_REDIS === '1'
            ? []
            : [
                BullModule.forRoot({
                    connection: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: parseInt(process.env.REDIS_PORT) || 6379,
                        username: process.env.REDIS_USERNAME,
                        password: process.env.REDIS_PASSWORD,
                        tls: (process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === '1') ? {} : undefined,
                    },
                }),
            ]),
        QueuesProviderModule.forRoot(),
        PrismaModule,
        IdempotencyModule,
        MetricsModule,
        AuditModule,
        AnalyticsModule,
        SharedModule,
        CommonModule,
        AuthModule,
        UsersModule,
        CoinsModule,
        RoomsModule,
        CatalogModule,
        OrdersModule,
        VendorsModule,
        PaymentsModule,
        AdminModule,
        CheckoutModule,
        BowModule,
        TelecallerModule,
        ReturnsModule,
        CartModule,
        UploadModule,
        ReviewsModule,
        GiftsModule,
        CouponsModule,
        BannersModule,
        VendorMembershipsModule,
        VendorStoreModule,
        VendorProductsModule,
        VendorOrdersModule,
        InventoryModule,
        VendorPayoutsModule,
        VendorFollowersModule,
        SearchModule,
        WalletModule,
        BetModule,
        WholesalersModule,
        StoriesModule,
        ReelsModule,
        CreatorsModule,
        ClearanceModule,
        VendorDocumentsModule,
        ContentModerationModule,
        BannerCampaignsModule,
        CampaignsModule,
        // New Modules - Week 1-2
        RefundsModule,
        SupportModule,
        // New Modules - Week 3-4
        EmployeesModule,
        DriversModule,
        CmsModule,
        BlogModule,
        NotificationsAdminModule,
        InvoicesModule,
    ],
    controllers: [HealthController], // RootHealthController registered manually in main.ts
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {
    configure(consumer: any) {
        consumer
            .apply(CorrelationIdMiddleware)
            .forRoutes('*');
    }
}
