import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VendorBowCoinLedgerService } from './vendor-bow-coin-ledger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Vendor Bow Coins')
@Controller('vendors/bow-coins')
@ApiBearerAuth()
export class VendorBowCoinLedgerController {
  constructor(private readonly ledgerService: VendorBowCoinLedgerService) {}

  @Get('me/balance')
  @ApiOperation({ summary: 'Get current vendor Bow Coin balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
  async getMyBalance(@CurrentUser() user: any) {
    const balance = await this.ledgerService.getVendorBalance(user.id);
    return { vendorId: user.id, balance };
  }

  @Get('me/ledger')
  @ApiOperation({ summary: 'Get Bow Coin ledger history for current vendor' })
  @ApiResponse({ status: 200, description: 'Ledger history retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
  async getMyLedger(@CurrentUser() user: any, @Query('limit') limit?: string) {
    const ledgerLimit = limit ? parseInt(limit) : 100;
    const entries = await this.ledgerService.getVendorLedger(user.id, ledgerLimit);
    const balance = await this.ledgerService.getVendorBalance(user.id);
    return { vendorId: user.id, balance, entries };
  }

  @Get(':vendorId/balance')
  @ApiOperation({ summary: 'Get vendor Bow Coin balance (Admin only)' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getVendorBalance(@Request() req: any, @Query('vendorId') vendorId: string) {
    const balance = await this.ledgerService.getVendorBalance(vendorId);
    return { vendorId, balance };
  }

  @Get(':vendorId/ledger')
  @ApiOperation({ summary: 'Get Bow Coin ledger history for a vendor (Admin only)' })
  @ApiResponse({ status: 200, description: 'Ledger history retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getVendorLedger(@Request() req: any, @Query('vendorId') vendorId: string, @Query('limit') limit?: string) {
    const ledgerLimit = limit ? parseInt(limit) : 100;
    const entries = await this.ledgerService.getVendorLedger(vendorId, ledgerLimit);
    const balance = await this.ledgerService.getVendorBalance(vendorId);
    return { vendorId, balance, entries };
  }
}
