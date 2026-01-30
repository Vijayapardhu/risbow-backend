import { Module } from '@nestjs/common';
import { BannersController } from './banners.controller';
import { AdminBannersController } from './admin-banners.controller';
import { BannersService } from './banners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueuesProviderModule } from '../queues/queues-provider.module';
import { PaymentsModule } from '../payments/payments.module';
import { CoinsModule } from '../coins/coins.module';

@Module({
    imports: [PrismaModule, QueuesProviderModule.forRoot(), PaymentsModule, CoinsModule],
    controllers: [BannersController, AdminBannersController],
    providers: [BannersService],
    exports: [BannersService],
})
export class BannersModule { }
