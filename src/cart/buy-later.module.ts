import { Module } from '@nestjs/common';
import { BuyLaterService } from './buy-later.service';
import { BuyLaterController } from './buy-later.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    PrismaModule,
    SharedModule
  ],
  controllers: [BuyLaterController],
  providers: [BuyLaterService],
  exports: [BuyLaterService],
})
export class BuyLaterModule {}