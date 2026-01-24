import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RecoveryService } from './recovery.service';
import { DemandMiningService } from './demand-mining.service';
import { CartAbandonmentService } from './cart-abandonment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [PrismaModule, CommonModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService, RecoveryService, DemandMiningService, CartAbandonmentService],
    exports: [RecoveryService, DemandMiningService, CartAbandonmentService]
})
export class AnalyticsModule { }
