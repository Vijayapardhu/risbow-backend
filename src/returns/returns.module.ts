import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { ReturnsQCController } from './returns-qc.controller';
import { AdminReturnsController } from './admin-returns.controller';
import { AdminRefundsController } from './admin-refunds.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../audit/audit.module';
import { ReturnsQCService } from './returns-qc.service';

@Module({
    imports: [PrismaModule, InventoryModule, AuditModule],
    controllers: [ReturnsController, ReturnsQCController, AdminReturnsController, AdminRefundsController],
    providers: [ReturnsService, ReturnsQCService],
    exports: [ReturnsService, ReturnsQCService],
})
export class ReturnsModule { }
