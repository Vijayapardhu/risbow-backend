import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';
import { GiftsModule } from '../gifts/gifts.module';
import { CouponsModule } from '../coupons/coupons.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [PrismaModule, CartModule, PaymentsModule, GiftsModule, CouponsModule, InventoryModule],
    controllers: [CheckoutController],
    providers: [CheckoutService],
    exports: [CheckoutService],
})
export class CheckoutModule { }
