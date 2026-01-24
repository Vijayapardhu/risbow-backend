import { Module } from '@nestjs/common';
import { CoinsService } from './coins.service';
import { CoinsController } from './coins.controller';
import { CoinValuationService } from './coin-valuation.service';

@Module({
    controllers: [CoinsController],
    providers: [CoinsService, CoinValuationService],
    exports: [CoinsService, CoinValuationService],
})
export class CoinsModule { }
