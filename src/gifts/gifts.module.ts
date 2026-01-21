import { Module } from '@nestjs/common';
import { GiftsController } from './gifts.controller';
import { GiftsService } from './gifts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [GiftsController],
    providers: [GiftsService],
    exports: [GiftsService],
})
export class GiftsModule { }
