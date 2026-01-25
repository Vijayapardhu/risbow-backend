import { Module } from '@nestjs/common';
import { DeliveryOptionsService } from './delivery-options.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DeliveryOptionsService],
  exports: [DeliveryOptionsService],
})
export class DeliveryModule {}

