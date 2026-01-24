import { Module } from '@nestjs/common';
import { WholesalersController } from './wholesalers.controller';
import { WholesalersService } from './wholesalers.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WholesalersController],
    providers: [WholesalersService],
    exports: [WholesalersService],
})
export class WholesalersModule { }
