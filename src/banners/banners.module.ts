import { Module } from '@nestjs/common';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueuesModule } from '../queues/queues.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [PrismaModule, QueuesModule, PaymentsModule],
    controllers: [BannersController],
    providers: [BannersService],
    exports: [BannersService],
})
export class BannersModule { }
