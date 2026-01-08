import { Module } from '@nestjs/common';
import { TelecallerController } from './telecaller.controller';
import { AdminService } from '../admin/admin.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TelecallerController],
    providers: [AdminService],
})
export class TelecallerModule { }
