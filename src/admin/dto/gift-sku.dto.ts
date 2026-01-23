import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GiftSkuDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  coinsRequired: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;
}
