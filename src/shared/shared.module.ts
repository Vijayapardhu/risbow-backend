import { Module, Global } from '@nestjs/common';
import { SchedulerService } from '../common/scheduler.service';
import { NotificationsService } from './notifications.service';
import { RedisService } from './redis.service';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';
import { CommunicationService } from './communication.service';
import { LogisticsService } from './logistics.service';
import { OpenRouterService } from './openrouter.service';
import { GeoService } from './geo.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CommonModule } from '../common/common.module';
import { TelecallerModule } from '../telecaller/telecaller.module';
import { QueuesModule } from '../queues/queues.module';
import { CoinsModule } from '../coins/coins.module';
import { VendorMembershipsModule } from '../vendor-memberships/vendor-memberships.module';

@Global()
@Module({
    imports: [AnalyticsModule, CatalogModule, CommonModule, TelecallerModule, QueuesModule, CoinsModule, VendorMembershipsModule],
    providers: [SchedulerService, NotificationsService, RedisService, SupabaseService, CacheService, CommunicationService, LogisticsService, OpenRouterService, GeoService, SupabaseStorageService],
    exports: [SchedulerService, NotificationsService, RedisService, SupabaseService, CacheService, CommunicationService, LogisticsService, OpenRouterService, GeoService, SupabaseStorageService],
})
export class SharedModule { }
