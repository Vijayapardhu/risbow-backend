import { Module } from '@nestjs/common';
import { VendorMembershipsController } from './vendor-memberships.controller';
import { VendorMembershipsService } from './vendor-memberships.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [VendorMembershipsController],
    providers: [VendorMembershipsService],
    exports: [VendorMembershipsService],
})
export class VendorMembershipsModule { }
