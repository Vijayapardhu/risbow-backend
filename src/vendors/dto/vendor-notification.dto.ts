import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum VendorNotificationType {
  ORDER_NEW = 'ORDER_NEW',
  STOCK_LOW = 'STOCK_LOW',
  RETURN_REQUEST = 'RETURN_REQUEST',
  PAYOUT_COMPLETED = 'PAYOUT_COMPLETED',
  REVIEW_NEW = 'REVIEW_NEW',
}

export class VendorNotificationQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by notification type',
    enum: VendorNotificationType,
  })
  @IsOptional()
  @IsEnum(VendorNotificationType)
  type?: VendorNotificationType;

  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @Type(() => Boolean)
  isRead?: boolean;
}

export class VendorNotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification body/message' })
  body: string;

  @ApiProperty({ description: 'Notification type', enum: VendorNotificationType })
  type: VendorNotificationType;

  @ApiProperty({ description: 'Read status' })
  isRead: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class UnreadCountResponseDto {
  @ApiProperty({ description: 'Number of unread notifications' })
  unreadCount: number;
}

export class MarkReadResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Number of notifications marked as read' })
  count: number;
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification body/message' })
  @IsString()
  body: string;

  @ApiProperty({ description: 'Notification type', enum: VendorNotificationType })
  @IsEnum(VendorNotificationType)
  type: VendorNotificationType;
}
