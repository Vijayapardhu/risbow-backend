import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders.admin.controller';
import { OrdersAdminAliasController } from './orders.admin-alias.controller';
import { RoomsModule } from '../rooms/rooms.module';
import { CoinsModule } from '../coins/coins.module';
import { InventoryModule } from '../inventory/inventory.module';
import { VendorsModule } from '../vendors/vendors.module';
import { CommonModule } from '../common/common.module';
import { AuditModule } from '../audit/audit.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { VendorOrdersModule } from '../vendor-orders/vendor-orders.module';

import { OrderStateMachine } from './order-state-machine';
import { OrderStateValidatorService } from './order-state-validator.service';

import { BowModule } from '../bow/bow.module';

@Module({
    imports: [RoomsModule, CoinsModule, InventoryModule, VendorsModule, CommonModule, forwardRef(() => BowModule), AuditModule, CheckoutModule, forwardRef(() => RecommendationsModule), ReferralsModule, VendorOrdersModule],
    controllers: [OrdersController, OrdersAdminController, OrdersAdminAliasController],
    providers: [OrdersService, OrderStateMachine, OrderStateValidatorService],
    exports: [OrdersService, OrderStateValidatorService],
})
export class OrdersModule { }
