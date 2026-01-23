import { Controller, Post, Body, Param, Patch, UsePipes, ValidationPipe } from '@nestjs/common';
import { BetService } from './bet.service';
import { PlaceBetDto, SettleBetDto } from './bet.dto';

@Controller('bets')
@UsePipes(new ValidationPipe())
export class BetController {
  constructor(private readonly betService: BetService) {}

  @Post()
  async placeBet(@Body() body: PlaceBetDto) {
    return this.betService.placeBet(body.userId, body.selections, body.stake, body.odds, body.idempotencyKey);
  }

  @Patch(':betId/settle')
  async settleBet(@Param('betId') betId: string, @Body() body: SettleBetDto) {
    return this.betService.settleBet(betId, body.result);
  }
}