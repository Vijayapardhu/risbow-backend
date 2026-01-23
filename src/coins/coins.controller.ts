import { Controller, UseGuards, Request, Post, Body, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoinsService } from './coins.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreditCoinDto, DebitCoinDto, CoinSource } from './dto/coin.dto';

@ApiTags('Coins')
@Controller('coins')
@UseGuards(JwtAuthGuard)
export class CoinsController {
        @Post('expire-cron')
        @UseGuards(RolesGuard)
        @Roles('ADMIN', 'SUPER_ADMIN')
        async expireCoinsCron() {
            return this.coinsService.expireCoinsCron();
        }
    constructor(private readonly coinsService: CoinsService) { }

    @Post('credit')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async credit(@Body() dto: CreditCoinDto) {
        // Admin-only: credit coins to any user
        return this.coinsService.credit(dto.userId, dto.amount, dto.source);
    }

    @Post('debit')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async debit(@Body() dto: DebitCoinDto) {
        // Admin-only: debit coins from any user
        return this.coinsService.debit(dto.userId, dto.amount, dto.source);
    }

    @Post('redeem')
    async redeem(@Request() req, @Body('amount', ParseIntPipe) amount: number) {
        // User can only redeem their own coins
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }
        return this.coinsService.debit(req.user.id, amount, CoinSource.SPEND_ORDER);
    }
}
