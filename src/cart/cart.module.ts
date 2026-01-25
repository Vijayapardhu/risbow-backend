import { Module, forwardRef } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { BuyLaterModule } from './buy-later.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
    imports: [PrismaModule, forwardRef(() => BuyLaterModule), forwardRef(() => RecommendationsModule)],
    controllers: [CartController],
    providers: [CartService],
    exports: [CartService, BuyLaterModule], // Exported for CheckoutModule usage
})
export class CartModule { }
