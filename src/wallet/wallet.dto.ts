import { IsString, IsNumber, IsPositive } from 'class-validator';

export class CreditWalletDto {
  @IsString()
  userId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  idempotencyKey: string;

  @IsString()
  source: string;
}

export class DebitWalletDto {
  @IsString()
  userId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  idempotencyKey: string;

  @IsString()
  source: string;
}