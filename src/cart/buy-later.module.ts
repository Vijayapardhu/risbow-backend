import { Module, forwardRef } from '@nestjs/common';
import { BuyLaterService } from './buy-later.service';
import { BuyLaterController } from './buy-later.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from './cart.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CartModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [BuyLaterController],
  providers: [BuyLaterService],
  exports: [BuyLaterService],
})
export class BuyLaterModule {}