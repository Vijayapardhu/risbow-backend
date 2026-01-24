import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateReferralRewardRuleDto {
  @ApiProperty({ description: 'Minimum order value (paise)', example: 50000 })
  @IsInt()
  @Min(0)
  minOrderPaise: number;

  @ApiPropertyOptional({ description: 'Maximum order value (paise), exclusive. Null = no max', example: 200000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxOrderPaise?: number;

  @ApiProperty({ description: 'Coins to credit inviter', example: 100 })
  @IsInt()
  @Min(0)
  coinsInviter: number;

  @ApiProperty({ description: 'Coins to credit invitee', example: 100 })
  @IsInt()
  @Min(0)
  coinsInvitee: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateReferralRewardRuleDto extends CreateReferralRewardRuleDto {}

