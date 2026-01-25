import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { QueuesModule } from './queues/queues.module';
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

import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { SharedModule } from './shared/shared.module';
import { CommonModule } from './common/common.module';
import { HealthController, RootHealthController } from './common/health.controller';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        ThrottlerModule.forRoot([{
            ttl: parseInt(process.env.THROTTLE_TTL) || 60000,
            limit: parseInt(process.env.THROTTLE_LIMIT) || 100,
        }]),
        // Redis & Queues - Disabled in Test Environment to handle missing Redis
        ...(process.env.NODE_ENV === 'test' ? [] : [
            BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT) || 6379,
                    username: process.env.REDIS_USERNAME,
                    password: process.env.REDIS_PASSWORD,
                    tls: (process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === '1') ? {} : undefined, // Azure Redis requires TLS
                },
            }),
            QueuesModule,
            AdminModule, // Depends on QueuesModule
        ]),
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
        // AdminModule handled above
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
        // QueuesModule handled above in conditional import
    ],
    controllers: [HealthController, RootHealthController],
})
export class AppModule {
    configure(consumer: any) {
        consumer
            .apply(CorrelationIdMiddleware)
            .forRoutes('*');
    }
}
