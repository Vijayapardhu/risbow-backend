import { Module } from '@nestjs/common';
import { BannerCampaignsService } from './banner-campaigns.service';
import { BannerCampaignsController } from './banner-campaigns.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BannerCampaignsController],
  providers: [BannerCampaignsService],
  exports: [BannerCampaignsService],
})
export class BannerCampaignsModule {}
