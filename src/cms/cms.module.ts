import { Module } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CmsController, AdminCmsController } from './cms.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CmsController, AdminCmsController],
  providers: [CmsService],
  exports: [CmsService]
})
export class CmsModule {}
