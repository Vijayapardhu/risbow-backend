import { Module } from '@nestjs/common';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueuesModule } from '../queues/queues.module';
import { PaymentsModule } from '../payments/payments.module';
import { CoinsModule } from '../coins/coins.module';

@Module({
    imports: [PrismaModule, QueuesModule, PaymentsModule, CoinsModule],
    controllers: [BannersController],
    providers: [BannersService],
    exports: [BannersService],
})
export class BannersModule { }
