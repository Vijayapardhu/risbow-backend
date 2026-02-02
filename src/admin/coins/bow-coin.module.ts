import { Module } from '@nestjs/common';
import { BowCoinService } from './bow-coin.service';
import { BowCoinController } from './bow-coin.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuditModule } from '../audit/admin-audit.module';

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [BowCoinController],
  providers: [BowCoinService],
  exports: [BowCoinService],
})
export class BowCoinModule {}
