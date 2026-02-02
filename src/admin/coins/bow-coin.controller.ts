import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BowCoinService, CoinTransactionType } from './bow-coin.service';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { AdminMfaGuard } from '../auth/guards/admin-mfa.guard';
import { RequirePermissions } from '../auth/decorators/admin-permissions.decorator';
import { RequireMfa } from '../auth/decorators/require-mfa.decorator';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { Permission } from '../rbac/admin-permissions.service';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTOs
class UpdateCoinConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valuePerCoin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  earnRatePerRupee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minRedemption?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRedemptionPercent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expiryDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  signupBonus?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  referralBonus?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewReward?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean;
}

class GrantCoinsDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ enum: CoinTransactionType, required: false })
  @IsOptional()
  @IsEnum(CoinTransactionType)
  type?: CoinTransactionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceId?: string;
}

class RevokeCoinsDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceId?: string;
}

class BulkGrantDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ enum: CoinTransactionType })
  @IsEnum(CoinTransactionType)
  type: CoinTransactionType;
}

@ApiTags('Bow Coin Management')
@Controller('admin/coins')
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@ApiBearerAuth()
export class BowCoinController {
  constructor(private coinService: BowCoinService) {}

  @Get('config')
  @RequirePermissions(Permission.COIN_READ)
  @ApiOperation({
    summary: 'Get coin configuration',
    description: 'Get the current Bow Coin economy configuration',
  })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getConfig() {
    return this.coinService.getConfig();
  }

  @Put('config')
  @RequirePermissions(Permission.COIN_CONFIG)
  @UseGuards(AdminMfaGuard)
  @RequireMfa()
  @ApiOperation({
    summary: 'Update coin configuration',
    description: 'Update the Bow Coin economy configuration (requires MFA)',
  })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Body() dto: UpdateCoinConfigDto,
    @CurrentAdmin('id') adminId: string,
  ) {
    return this.coinService.updateConfig(dto, adminId);
  }

  @Get('user/:userId/balance')
  @RequirePermissions(Permission.COIN_READ)
  @ApiOperation({
    summary: 'Get user coin balance',
    description: 'Get the current coin balance for a user',
  })
  @ApiResponse({ status: 200, description: 'Balance retrieved' })
  async getUserBalance(@Param('userId') userId: string) {
    return this.coinService.getUserBalance(userId);
  }

  @Get('user/:userId/transactions')
  @RequirePermissions(Permission.COIN_READ)
  @ApiOperation({
    summary: 'Get user transaction history',
    description: 'Get coin transaction history for a user',
  })
  @ApiQuery({ name: 'type', required: false, enum: CoinTransactionType })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query('type') type?: CoinTransactionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coinService.getUserTransactions(userId, {
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post('grant')
  @RequirePermissions(Permission.COIN_GRANT)
  @ApiOperation({
    summary: 'Grant coins to a user',
    description: 'Manually grant coins to a user',
  })
  @ApiResponse({ status: 201, description: 'Coins granted' })
  async grantCoins(
    @Body() dto: GrantCoinsDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.coinService.grantCoins({
      ...dto,
      adminId: admin.id,
      adminEmail: admin.email,
    });
  }

  @Post('revoke')
  @RequirePermissions(Permission.COIN_REVOKE)
  @ApiOperation({
    summary: 'Revoke coins from a user',
    description: 'Manually revoke coins from a user',
  })
  @ApiResponse({ status: 201, description: 'Coins revoked' })
  async revokeCoins(
    @Body() dto: RevokeCoinsDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.coinService.revokeCoins({
      ...dto,
      adminId: admin.id,
      adminEmail: admin.email,
    });
  }

  @Post('bulk-grant')
  @RequirePermissions(Permission.COIN_GRANT)
  @UseGuards(AdminMfaGuard)
  @RequireMfa()
  @ApiOperation({
    summary: 'Bulk grant coins',
    description: 'Grant coins to multiple users at once (requires MFA)',
  })
  @ApiResponse({ status: 201, description: 'Bulk grant completed' })
  async bulkGrant(
    @Body() dto: BulkGrantDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.coinService.bulkGrant(
      dto.userIds,
      dto.amount,
      dto.reason,
      dto.type,
      admin.id,
      admin.email,
    );
  }

  @Get('analytics')
  @RequirePermissions(Permission.COIN_READ, Permission.REPORT_VIEW)
  @ApiOperation({
    summary: 'Get coin analytics',
    description: 'Get coin economy analytics for a time period',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.coinService.getAnalytics(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('process-expired')
  @RequirePermissions(Permission.COIN_CONFIG)
  @ApiOperation({
    summary: 'Process expired coins',
    description: 'Batch job to process and expire old coins',
  })
  @ApiResponse({ status: 200, description: 'Expired coins processed' })
  async processExpiredCoins() {
    return this.coinService.processExpiredCoins();
  }
}
