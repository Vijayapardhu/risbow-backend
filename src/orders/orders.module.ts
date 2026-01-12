import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders.admin.controller';
import { RoomsModule } from '../rooms/rooms.module';
import { CoinsModule } from '../coins/coins.module';

@Module({
    imports: [RoomsModule, CoinsModule],
    controllers: [OrdersController, OrdersAdminController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
