import { Module } from '@nestjs/common';
import { BowService } from './bow.service';
import { BowController } from './bow.controller';

@Module({
    controllers: [BowController],
    providers: [BowService],
})
export class BowModule { }
