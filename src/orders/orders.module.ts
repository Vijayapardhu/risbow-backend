import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders.admin.controller';
import { RoomsModule } from '../rooms/rooms.module';
import { CoinsModule } from '../coins/coins.module';
import { InventoryModule } from '../inventory/inventory.module'; // Added
import { VendorsModule } from '../vendors/vendors.module';

import { OrderStateMachine } from './order-state-machine';

@Module({
    imports: [RoomsModule, CoinsModule, InventoryModule, VendorsModule],
    controllers: [OrdersController, OrdersAdminController],
    providers: [OrdersService, OrderStateMachine],
    exports: [OrdersService],
})
export class OrdersModule { }
