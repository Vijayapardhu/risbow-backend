import { Module } from '@nestjs/common';
import { VendorStrikeService } from './vendor-strike.service';
import { VendorStrikeController } from './vendor-strike.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuditModule } from '../audit/admin-audit.module';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [VendorStrikeController],
  providers: [VendorStrikeService],
  exports: [VendorStrikeService],
})
export class VendorStrikeModule {}
