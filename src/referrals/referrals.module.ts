import { Module } from '@nestjs/common';
import { ReferralRewardsService } from './referral-rewards.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinsModule } from '../coins/coins.module';

@Module({
  imports: [PrismaModule, CoinsModule],
  providers: [ReferralRewardsService],
  exports: [ReferralRewardsService],
})
export class ReferralsModule {}

