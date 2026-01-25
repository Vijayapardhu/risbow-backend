import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';
import { GiftsModule } from '../gifts/gifts.module';
import { CouponsModule } from '../coupons/coupons.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SharedModule } from '../shared/shared.module';
import { CommonModule } from '../common/common.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
    imports: [PrismaModule, CartModule, PaymentsModule, GiftsModule, CouponsModule, InventoryModule, SharedModule, CommonModule, DeliveryModule],
    controllers: [CheckoutController],
    providers: [CheckoutService],
    exports: [CheckoutService],
})
export class CheckoutModule { }
