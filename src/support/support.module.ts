import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService],
  exports: [SupportService]
})
export class SupportModule {}
