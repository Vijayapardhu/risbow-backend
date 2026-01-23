import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MembershipType {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  WHOLESALER = 'WHOLESALER',
}

export class MembershipDto {
  @ApiProperty({ enum: MembershipType })
  @IsEnum(MembershipType)
  type: MembershipType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  durationMonths?: number;
}
