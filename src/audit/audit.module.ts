import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [AuditLogService],
    exports: [AuditLogService],
})
export class AuditModule { }
