import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService]
})
export class RefundsModule {}
