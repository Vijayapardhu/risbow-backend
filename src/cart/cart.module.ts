import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { BuyLaterModule } from './buy-later.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
    imports: [PrismaModule, BuyLaterModule, RecommendationsModule],
    controllers: [CartController],
    providers: [CartService],
    exports: [CartService, BuyLaterModule], // Exported for CheckoutModule usage
})
export class CartModule { }
