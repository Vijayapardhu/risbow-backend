import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';

export class SetCoinValuationDto {
  @ApiProperty({ enum: UserRole, example: 'CUSTOMER' })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    example: 100,
    description: 'Integer paise per 1 coin. Example: 100 => ₹1/coin, 10 => ₹0.10/coin',
  })
  @IsInt()
  @Min(1)
  paisePerCoin: number;
}

