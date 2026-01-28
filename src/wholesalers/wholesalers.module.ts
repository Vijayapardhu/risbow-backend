import { Module } from '@nestjs/common';
import { WholesalersController } from './wholesalers.controller';
import { WholesalersService } from './wholesalers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
    imports: [PrismaModule, SharedModule],
    controllers: [WholesalersController],
    providers: [WholesalersService],
    exports: [WholesalersService],
})
export class WholesalersModule { }
