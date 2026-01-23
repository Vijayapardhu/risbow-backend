import { IsString, IsNumber, IsPositive, IsEnum } from 'class-validator';

export class PlaceBetDto {
  @IsString()
  userId: string;

  selections: any; // JSON

  @IsNumber()
  @IsPositive()
  stake: number;

  @IsNumber()
  @IsPositive()
  odds: number;

  @IsString()
  idempotencyKey: string;
}

export class SettleBetDto {
  @IsEnum(['WIN', 'LOSE', 'VOIDED'])
  result: 'WIN' | 'LOSE' | 'VOIDED';
}