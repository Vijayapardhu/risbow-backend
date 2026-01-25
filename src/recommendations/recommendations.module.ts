import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { EcommerceEventsService } from './ecommerce-events.service';
import { ProductSuggestionsService } from './product-suggestions.service';
import { DeliveryModule } from '../delivery/delivery.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [PrismaModule, SharedModule, DeliveryModule, VendorsModule],
  providers: [EcommerceEventsService, ProductSuggestionsService],
  exports: [EcommerceEventsService, ProductSuggestionsService],
})
export class RecommendationsModule {}

