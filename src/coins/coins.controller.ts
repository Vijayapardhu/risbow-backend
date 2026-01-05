import { Controller, Get, UseGuards, Request, Post, Body, Param } from '@nestjs/common';
import { CoinsService } from './coins.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreditCoinDto, DebitCoinDto } from './dto/coin.dto';

@Controller('coins')
@UseGuards(JwtAuthGuard)
export class CoinsController {
    constructor(private readonly coinsService: CoinsService) { }

    @Post('credit') // Internal use or Admin only. For now secured by JWT.
    async credit(@Body() dto: CreditCoinDto) {
        return this.coinsService.credit(dto.userId, dto.amount, dto.source);
    }

    @Post('debit')
    async debit(@Body() dto: DebitCoinDto) {
        return this.coinsService.debit(dto.userId, dto.amount, dto.source);
    }
}
