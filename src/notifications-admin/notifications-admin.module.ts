import { Module } from '@nestjs/common';
import { NotificationsAdminService } from './notifications-admin.service';
import { NotificationsAdminController } from './notifications-admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsAdminController],
  providers: [NotificationsAdminService],
  exports: [NotificationsAdminService]
})
export class NotificationsAdminModule {}
