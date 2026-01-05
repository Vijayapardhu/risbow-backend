import { Module } from '@nestjs/common';
import { CoinsService } from './coins.service';
import { CoinsController } from './coins.controller';

@Module({
    controllers: [CoinsController],
    providers: [CoinsService],
    exports: [CoinsService],
})
export class CoinsModule { }
