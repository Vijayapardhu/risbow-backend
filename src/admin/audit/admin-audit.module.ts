import { Module, Global } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AdminAuditController],
  providers: [AdminAuditService, AdminAuditInterceptor],
  exports: [AdminAuditService, AdminAuditInterceptor],
})
export class AdminAuditModule {}
