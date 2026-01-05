import { Module, Global } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SchedulerService } from '../common/scheduler.service';
import { NotificationsService } from './notifications.service';
import { RedisService } from './redis.service';

@Global()
@Module({
    providers: [SeedService, SchedulerService, NotificationsService, RedisService],
    exports: [SeedService, SchedulerService, NotificationsService, RedisService],
})
export class SharedModule { }
