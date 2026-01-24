import { Body, Controller, Get, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CoinValuationService } from '../coins/coin-valuation.service';
import { AuditLogService } from '../audit/audit.service';
import { SetCoinValuationDto } from './dto/coin-valuation.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/coin-valuation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class CoinValuationController {
  constructor(
    private readonly valuation: CoinValuationService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current Bow Coin valuation map (per role)' })
  async getCurrent(@Query('at') at?: string) {
    const when = at ? new Date(at) : new Date();
    return {
      at: when.toISOString(),
      valuations: await this.valuation.getActiveValuations(when),
    };
  }

  @Put()
  @ApiOperation({ summary: 'Set Bow Coin valuation for a role (future-only)' })
  async set(@Req() req: any, @Body() dto: SetCoinValuationDto) {
    const actorUserId = req?.user?.id;
    const created = await this.valuation.setValuation({
      actorUserId,
      role: dto.role,
      paisePerCoin: dto.paisePerCoin,
    });

    await this.audit.logAdminAction(
      actorUserId,
      'SET_COIN_VALUATION',
      'CoinValuation',
      `${dto.role}`,
      { role: dto.role, paisePerCoin: dto.paisePerCoin },
    );

    return created;
  }
}

