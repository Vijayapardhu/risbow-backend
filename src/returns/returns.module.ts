import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [PrismaModule, SharedModule, InventoryModule],
    controllers: [ReturnsController],
    providers: [ReturnsService],
})
export class ReturnsModule { }
