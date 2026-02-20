import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

import { BowModule } from '../bow/bow.module';
import { CheckoutModule } from '../checkout/checkout.module';

@Module({
    imports: [PrismaModule, ConfigModule, forwardRef(() => BowModule), forwardRef(() => CheckoutModule)],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
