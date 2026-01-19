import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit.service';
import { PrismaModule } from '../prisma/prisma.module';

import { AuditController } from './audit.controller';

@Global()
@Module({
    imports: [PrismaModule],
    controllers: [AuditController],
    providers: [AuditLogService],
    exports: [AuditLogService],
})
export class AuditModule { }
