import { Module, Global } from '@nestjs/common';
import { SchedulerService } from '../common/scheduler.service';
import { NotificationsService } from './notifications.service';
import { RedisService } from './redis.service';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
    providers: [SchedulerService, NotificationsService, RedisService, SupabaseService],
    exports: [SchedulerService, NotificationsService, RedisService, SupabaseService],
})
export class SharedModule { }
