import { Module } from '@nestjs/common';
import { VendorOrdersService } from './vendor-orders.service';
import { VendorOrdersController } from './vendor-orders.controller';
import { OrdersModule } from '../orders/orders.module'; // To export StateMachine if needed, or import directly?
import { OrderStateMachine } from '../orders/order-state-machine'; // Service is not a module
// OrderStateMachine needs to be provided. It is in orders directory but not verified if strictly in OrdersModule exports.
// Providing it here directly or importing Shared/OrdersModule.
import { PrismaModule } from '../prisma/prisma.module';
import { PackingProofService } from './packing-proof.service';
import { SharedModule } from '../shared/shared.module';

@Module({
    imports: [PrismaModule, SharedModule],
    controllers: [VendorOrdersController],
    providers: [VendorOrdersService, OrderStateMachine, PackingProofService], // Providing SM directly for simplicity
})
export class VendorOrdersModule { }
