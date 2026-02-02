import { Module } from '@nestjs/common';
import { ContentModerationService } from './content-moderation.service';
import { ContentModerationController } from './content-moderation.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuditModule } from '../audit/admin-audit.module';
import { VendorStrikeModule } from '../strikes/vendor-strike.module';

@Module({
  imports: [PrismaModule, AdminAuditModule, VendorStrikeModule],
  controllers: [ContentModerationController],
  providers: [ContentModerationService],
  exports: [ContentModerationService],
})
export class ContentModerationModule {}
