import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { OrderProcessor } from './processors/order.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { CartIntelligenceProcessor } from './processors/cart-intelligence.processor';
import { QueuesService } from './queues.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BowModule } from '../bow/bow.module';

@Module({
    imports: [
        PrismaModule,
        BowModule,
        // Analytics Queue - Banner impressions/clicks
        BullModule.registerQueue({
            name: 'analytics',
        }),
        // Notification Queue - Push/Email notifications
        BullModule.registerQueue({
            name: 'notifications',
        }),
        // Order Queue - Stock deduction, timeline, coin debit
        BullModule.registerQueue({
            name: 'orders',
        }),
        // Cleanup Queue - Scheduled cleanup tasks
        BullModule.registerQueue({
            name: 'cleanup',
        }),
        // Cart Intelligence Queue - AI-driven cart optimization
        BullModule.registerQueue({
            name: 'cart-intelligence',
        }),
    ],
    providers: [
        QueuesService,
        AnalyticsProcessor,
        NotificationProcessor,
        OrderProcessor,
        CleanupProcessor,
        CartIntelligenceProcessor,
    ],
    exports: [QueuesService],
})
export class QueuesModule { }
