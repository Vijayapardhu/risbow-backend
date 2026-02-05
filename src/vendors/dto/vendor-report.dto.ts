import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GroupByPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
}

export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class SalesReportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Group results by period',
    enum: GroupByPeriod,
    default: GroupByPeriod.DAY,
  })
  @IsOptional()
  @IsEnum(GroupByPeriod)
  groupBy?: GroupByPeriod = GroupByPeriod.DAY;
}

export class OrdersReportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Export format',
    enum: ExportFormat,
    default: ExportFormat.JSON,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;

  @ApiPropertyOptional({ description: 'Filter by order status' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class InventoryReportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Filter by stock status: low, out, in_stock' })
  @IsOptional()
  @IsString()
  stockStatus?: string;
}

export class SalesReportItemDto {
  @ApiProperty({ description: 'Period date' })
  date: string;

  @ApiProperty({ description: 'Number of orders' })
  ordersCount: number;

  @ApiProperty({ description: 'Total revenue in paise' })
  revenue: number;

  @ApiProperty({ description: 'Average order value in paise' })
  averageOrderValue: number;
}

export class SalesReportResponseDto {
  @ApiProperty({ type: [SalesReportItemDto] })
  data: SalesReportItemDto[];

  @ApiProperty()
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    period: {
      from: string;
      to: string;
    };
  };
}

export class OrderReportItemDto {
  @ApiProperty()
  orderId: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  customer: string;

  @ApiProperty()
  items: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  status: string;
}

export class InventoryReportItemDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  stock: number;

  @ApiProperty({ description: 'Inventory value (stock * price) in paise' })
  value: number;

  @ApiProperty({ description: 'Stock status: in_stock, low, out_of_stock' })
  status: string;
}

export class InventoryReportResponseDto {
  @ApiProperty({ type: [InventoryReportItemDto] })
  data: InventoryReportItemDto[];

  @ApiProperty()
  summary: {
    totalProducts: number;
    totalStock: number;
    totalValue: number;
    outOfStock: number;
    lowStock: number;
  };
}

export class RevenueReportResponseDto {
  @ApiProperty({ description: 'Gross sales in paise' })
  grossSales: number;

  @ApiProperty({ description: 'Platform commission in paise' })
  platformCommission: number;

  @ApiProperty({ description: 'Net earnings in paise' })
  netEarnings: number;

  @ApiProperty()
  breakdown: {
    ordersCount: number;
    itemsSold: number;
    averageCommissionRate: number;
  };

  @ApiProperty()
  period: {
    from: string;
    to: string;
  };
}

export class ProductPerformanceItemDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  unitsSold: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  ordersCount: number;

  @ApiProperty()
  averagePrice: number;
}

export class ProductPerformanceResponseDto {
  @ApiProperty({ type: [ProductPerformanceItemDto] })
  data: ProductPerformanceItemDto[];

  @ApiProperty()
  summary: {
    totalProducts: number;
    totalUnitsSold: number;
    totalRevenue: number;
  };

  @ApiProperty()
  period: {
    from: string;
    to: string;
  };
}
