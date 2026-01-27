import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsInt, IsDateString, Min } from 'class-validator';

export enum CampaignType {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum TargetAudience {
  CUSTOMERS = 'CUSTOMERS',
  RETAILERS = 'RETAILERS',
}

export class CreateBannerCampaignDto {
  @ApiProperty({ description: 'Type of campaign (WEEKLY or MONTHLY)', enum: CampaignType })
  @IsEnum(CampaignType)
  campaignType: CampaignType;

  @ApiProperty({ description: 'Target audience (CUSTOMERS or RETAILERS)', enum: TargetAudience })
  @IsEnum(TargetAudience)
  targetAudience: TargetAudience;

  @ApiProperty({ description: 'Campaign start date (ISO 8601 format)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Campaign end date (ISO 8601 format)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Amount paid for the campaign in paise' })
  @IsInt()
  @Min(0)
  amountPaid: number;
}
