import { Module } from '@nestjs/common';
import { BannerCampaignService } from './banner-campaign.service';
import { BannerCampaignController } from './banner-campaign.controller';
import { AdminBannersController } from './admin-banners-new.controller';
import { AdminBannersService } from './admin-banners.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuditModule } from '../audit/admin-audit.module';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [AdminBannersController, BannerCampaignController],
  providers: [AdminBannersService, BannerCampaignService],
  exports: [AdminBannersService, BannerCampaignService],
})
export class BannerCampaignModule { }
