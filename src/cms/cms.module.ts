import { Module } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CmsSettingsService } from './cms-settings.service';
import { CmsController, AdminCmsController, PublicPagesController, CmsSettingsController } from './cms.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CmsController, AdminCmsController, PublicPagesController, CmsSettingsController],
  providers: [CmsService, CmsSettingsService],
  exports: [CmsService, CmsSettingsService]
})
export class CmsModule {}
