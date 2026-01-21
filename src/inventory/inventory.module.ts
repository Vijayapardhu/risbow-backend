import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
    imports: [PrismaModule, SharedModule], // SharedModule for RedisService interaction later
    controllers: [InventoryController],
    providers: [InventoryService],
    exports: [InventoryService]
})
export class InventoryModule { }
