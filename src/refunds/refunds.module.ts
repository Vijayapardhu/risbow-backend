import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [PaymentsModule],
    controllers: [RefundsController],
    providers: [RefundsService, PrismaService],
    exports: [RefundsService]
})
export class RefundsModule { }
