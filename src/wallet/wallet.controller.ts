import { Controller, Post, Body, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreditWalletDto, DebitWalletDto } from './wallet.dto';

@Controller('wallet')
@UsePipes(new ValidationPipe())
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('credit')
  async credit(@Body() body: CreditWalletDto) {
    return this.walletService.creditWallet(body.userId, body.amount, body.idempotencyKey, body.source);
  }

  @Post('debit')
  async debit(@Body() body: DebitWalletDto) {
    return this.walletService.debitWallet(body.userId, body.amount, body.idempotencyKey, body.source);
  }

  @Get('balance/:userId')
  async getBalance(@Param('userId') userId: string) {
    // Placeholder - implement in service
    return { userId, balance: 0 };
  }

  @Post('reconcile/:userId')
  async reconcile(@Param('userId') userId: string) {
    return this.walletService.reconcileWallet(userId);
  }
}