import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RoomOfferDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  offerId: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  discountPercent?: number;
}
