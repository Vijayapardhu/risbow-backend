import { Module, Global } from '@nestjs/common';
import { SchedulerService } from '../common/scheduler.service';
import { NotificationsService } from './notifications.service';
import { RedisService } from './redis.service';

@Global()
@Module({
    providers: [SchedulerService, NotificationsService, RedisService],
    exports: [SchedulerService, NotificationsService, RedisService],
})
export class SharedModule { }
