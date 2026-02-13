import { Controller, UseGuards, Request, Post, Body, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CoinsService } from './coins.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreditCoinDto, DebitCoinDto, CoinSource } from './dto/coin.dto';
import { Idempotent } from '../idempotency/idempotency.decorator';

@ApiTags('Coins')
@ApiBearerAuth()
@Controller('coins')
@UseGuards(JwtAuthGuard)
export class CoinsController {
    constructor(private readonly coinsService: CoinsService) { }

    @Post('expire-cron')
    @UseGuards(RolesGuard)
    @Roles('SUPER_ADMIN')  // SECURITY: Cron operations require SUPER_ADMIN
    @Throttle({ default: { limit: 1, ttl: 60000 } })  // SECURITY: Limit cron triggers
    async expireCoinsCron() {
        return this.coinsService.expireCoinsCron();
    }

    @Post('credit')
    @UseGuards(RolesGuard)
    @Roles('SUPER_ADMIN')  // SECURITY: Financial operations require SUPER_ADMIN
    @Throttle({ default: { limit: 10, ttl: 60000 } })  // SECURITY: Rate limit coin grants
    async credit(@Body() dto: CreditCoinDto) {
        // Admin-only: credit coins to any user
        return this.coinsService.credit(dto.userId, dto.amount, dto.source);
    }

    @Post('debit')
    @UseGuards(RolesGuard)
    @Roles('SUPER_ADMIN')  // SECURITY: Financial operations require SUPER_ADMIN
    @Throttle({ default: { limit: 10, ttl: 60000 } })  // SECURITY: Rate limit coin debits
    async debit(@Body() dto: DebitCoinDto) {
        // Admin-only: debit coins from any user
        return this.coinsService.debit(dto.userId, dto.amount, dto.source);
    }

    @Post('redeem')
    @Idempotent({ required: true, ttlSeconds: 300 })
    async redeem(@Request() req: any, @Body('amount', ParseIntPipe) amount: number) {
        // User can only redeem their own coins
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }
        return this.coinsService.debit(req.user.id, amount, CoinSource.SPEND_ORDER);
    }
}
