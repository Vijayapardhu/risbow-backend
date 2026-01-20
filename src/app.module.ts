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

import { UploadModule } from './upload/upload.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RefundsModule } from './refunds/refunds.module';

import { SharedModule } from './shared/shared.module';
import { HealthController } from './common/health.controller';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
            },
        }),
        PrismaModule,
        AuditModule,
        AnalyticsModule,
        SharedModule,
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
        RefundsModule,
    ],
    controllers: [HealthController],
})
export class AppModule { }
