import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto, ReferralClaimDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoinsService } from '../coins/coins.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly coinsService: CoinsService,
    ) { }

    @Get('me')
    async getProfile(@Request() req) {
        const user = await this.usersService.findOne(req.user.id);
        // Remove sensitive data if needed, simplified for now
        return user;
    }

    @Post() // or PATCH /users/me
    async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(req.user.id, updateUserDto);
    }

    @Get('me/coins')
    async getCoins(@Request() req) {
        const balance = await this.coinsService.getBalance(req.user.id);
        const ledger = await this.coinsService.getLedger(req.user.id);
        return { ...balance, ledger };
    }
}

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    async getReferralInfo(@Request() req) {
        const user = await this.usersService.findOne(req.user.id);
        // To count referred users, would need a query. 
        // For brevity, just return the code.
        return { referralCode: user.referralCode };
    }

    @Post('claim')
    async claimReferral(@Request() req, @Body() dto: ReferralClaimDto) {
        return this.usersService.claimReferral(req.user.id, dto.refCode);
    }
}
