import { Module } from '@nestjs/common';
import { BannerCampaignService } from './banner-campaign.service';
import { BannerCampaignController } from './banner-campaign.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuditModule } from '../audit/admin-audit.module';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [BannerCampaignController],
  providers: [BannerCampaignService],
  exports: [BannerCampaignService],
})
export class BannerCampaignModule {}
