import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EcommerceEventsService } from './ecommerce-events.service';
import { ProductSuggestionsService } from './product-suggestions.service';
import { DeliveryModule } from '../delivery/delivery.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    PrismaModule,
    DeliveryModule,
    forwardRef(() => VendorsModule),
  ],
  providers: [EcommerceEventsService, ProductSuggestionsService],
  exports: [EcommerceEventsService, ProductSuggestionsService],
})
export class RecommendationsModule {}

