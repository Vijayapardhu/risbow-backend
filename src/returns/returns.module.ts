import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { AdminReturnsController } from './admin-returns.controller';
import { AdminRefundsController } from './admin-refunds.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, InventoryModule, AuditModule],
    controllers: [ReturnsController, AdminReturnsController, AdminRefundsController],
    providers: [ReturnsService],
})
export class ReturnsModule { }
