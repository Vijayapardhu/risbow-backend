import { Module } from '@nestjs/common';
import { VendorPayoutsController } from './vendor-payouts.controller';
import { VendorPayoutsService } from './vendor-payouts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, AuditModule],
    controllers: [VendorPayoutsController],
    providers: [VendorPayoutsService],
    exports: [VendorPayoutsService]
})
export class VendorPayoutsModule { }
