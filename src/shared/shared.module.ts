import { Module, Global } from '@nestjs/common';
import { SchedulerService } from '../common/scheduler.service';
import { NotificationsService } from './notifications.service';
import { RedisService } from './redis.service';
import { SupabaseService } from './supabase.service';
import { CacheService } from './cache.service';

@Global()
@Module({
    providers: [SchedulerService, NotificationsService, RedisService, SupabaseService, CacheService],
    exports: [SchedulerService, NotificationsService, RedisService, SupabaseService, CacheService],
})
export class SharedModule { }
