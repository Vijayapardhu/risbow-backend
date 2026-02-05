import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EcommerceEventsService } from './ecommerce-events.service';
import { ProductSuggestionsService } from './product-suggestions.service';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { DeliveryModule } from '../delivery/delivery.module';
import { VendorsModule } from '../vendors/vendors.module';
import { SharedModule } from '../shared/shared.module';
import { BowModule } from '../bow/bow.module';

@Module({
  imports: [
    PrismaModule,
    SharedModule,
    DeliveryModule,
    forwardRef(() => VendorsModule),
    forwardRef(() => BowModule),
  ],
  controllers: [RecommendationsController],
  providers: [EcommerceEventsService, ProductSuggestionsService, RecommendationsService],
  exports: [EcommerceEventsService, ProductSuggestionsService, RecommendationsService],
})
export class RecommendationsModule {}

