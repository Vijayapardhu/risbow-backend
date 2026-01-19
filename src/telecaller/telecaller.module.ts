import { Module } from '@nestjs/common';
import { TelecallerController } from './telecaller.controller';
import { TelecallerService } from './telecaller.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [TelecallerController],
    providers: [TelecallerService, PrismaService],
})
export class TelecallerModule { }
