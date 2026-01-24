import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { EcommerceEventsService } from './ecommerce-events.service';

@Module({
  imports: [PrismaModule, SharedModule],
  providers: [EcommerceEventsService],
  exports: [EcommerceEventsService],
})
export class RecommendationsModule {}

