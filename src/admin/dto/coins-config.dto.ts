import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CoinsConfigDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  earnRate: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  spendRate: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  expiryDays?: number;
}
