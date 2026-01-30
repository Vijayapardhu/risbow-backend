import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [InventoryController, AdminInventoryController],
    providers: [InventoryService],
    exports: [InventoryService]
})
export class InventoryModule { }
