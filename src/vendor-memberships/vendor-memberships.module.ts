import { Module, forwardRef } from '@nestjs/common';
import { VendorMembershipsController } from './vendor-memberships.controller';
import { VendorMembershipsService } from './vendor-memberships.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { CoinsModule } from '../coins/coins.module';

@Module({
    imports: [PrismaModule, forwardRef(() => PaymentsModule), CoinsModule],
    controllers: [VendorMembershipsController],
    providers: [VendorMembershipsService],
    exports: [VendorMembershipsService],
})
export class VendorMembershipsModule { }
