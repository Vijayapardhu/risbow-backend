import { Body, Controller, Get, Put, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { CoinValuationService } from '../coins/coin-valuation.service';
import { AuditLogService } from '../audit/audit.service';
import { SetCoinValuationDto } from './dto/coin-valuation.dto';
import { randomUUID } from 'crypto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/coin-valuation')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.OPERATIONS_ADMIN)
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

  @Put('rating-coins')
  @ApiOperation({ summary: 'Set coins awarded per 5-star rating (configurable)' })
  async setRatingCoins(@Req() req: any, @Body() body: { coins: number }) {
    const actorUserId = req?.user?.id;
    const { coins } = body;

    if (!Number.isInteger(coins) || coins < 0) {
      throw new BadRequestException('coins must be a non-negative integer');
    }

    // Store in PlatformConfig
    const config = await this.valuation['prisma'].platformConfig.upsert({
      where: { category_key: { category: 'COINS', key: 'RATING_5_STAR_COINS' } },
      create: {
        id: randomUUID(),
        category: 'COINS',
        key: 'RATING_5_STAR_COINS',
        value: coins.toString(),
        updatedById: 'system',
        updatedAt: new Date(),
      },
      update: {
        value: coins.toString(),
      },
    });

    await this.audit.logAdminAction(
      actorUserId,
      'SET_RATING_COINS',
      'PlatformConfig',
      'RATING_5_STAR_COINS',
      { coins },
    );

    return { success: true, coins, message: `5-star ratings will now award ${coins} Bow Coins to vendors` };
  }

  @Get('rating-coins')
  @ApiOperation({ summary: 'Get current coins awarded per 5-star rating' })
  async getRatingCoins() {
    const config = await this.valuation['prisma'].platformConfig.findUnique({
      where: { category_key: { category: 'COINS', key: 'RATING_5_STAR_COINS' } },
    });

    const coins = config ? parseInt(config.value as string) || 2 : 2; // Default: 2 coins
    return { coins };
  }
}

