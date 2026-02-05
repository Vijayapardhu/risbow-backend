import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class VendorOrderQueryDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Filter by order status',
        enum: ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @ApiPropertyOptional({ description: 'Filter orders from date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter orders to date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiPropertyOptional({ description: 'Search by orderId or customer name' })
    @IsOptional()
    @IsString()
    search?: string;
}

export class UpdateOrderStatusDto {
    @ApiProperty({
        description: 'New order status',
        enum: ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    })
    @IsNotEmpty()
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @ApiPropertyOptional({ description: 'Note for status change' })
    @IsOptional()
    @IsString()
    note?: string;
}

export class UpdateTrackingDto {
    @ApiProperty({ description: 'Tracking number from carrier' })
    @IsNotEmpty()
    @IsString()
    trackingNumber: string;

    @ApiProperty({ description: 'Carrier/courier name' })
    @IsNotEmpty()
    @IsString()
    carrier: string;

    @ApiPropertyOptional({ description: 'Tracking URL' })
    @IsOptional()
    @IsUrl()
    trackingUrl?: string;
}

export class CancelOrderDto {
    @ApiProperty({ description: 'Reason for cancellation' })
    @IsNotEmpty()
    @IsString()
    reason: string;
}

export class OrderTimelineEntry {
    status: OrderStatus;
    note?: string;
    timestamp: Date;
    actor: string;
    actorType: 'VENDOR' | 'ADMIN' | 'SYSTEM';
}
