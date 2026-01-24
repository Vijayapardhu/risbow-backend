import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders.admin.controller';
import { RoomsModule } from '../rooms/rooms.module';
import { CoinsModule } from '../coins/coins.module';
import { InventoryModule } from '../inventory/inventory.module';
import { VendorsModule } from '../vendors/vendors.module';
import { CommonModule } from '../common/common.module';
import { AuditModule } from '../audit/audit.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { ReferralsModule } from '../referrals/referrals.module';

import { OrderStateMachine } from './order-state-machine';
import { OrderStateValidatorService } from './order-state-validator.service';

import { BowModule } from '../bow/bow.module';

@Module({
    imports: [RoomsModule, CoinsModule, InventoryModule, VendorsModule, CommonModule, BowModule, AuditModule, CheckoutModule, RecommendationsModule, ReferralsModule],
    controllers: [OrdersController, OrdersAdminController],
    providers: [OrdersService, OrderStateMachine, OrderStateValidatorService],
    exports: [OrdersService],
})
export class OrdersModule { }
