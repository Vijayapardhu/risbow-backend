import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionService } from '../common/commission.service';
import { OrderStatus } from '@prisma/client';
import {
  SalesReportQueryDto,
  OrdersReportQueryDto,
  InventoryReportQueryDto,
  DateRangeQueryDto,
  GroupByPeriod,
  SalesReportResponseDto,
  SalesReportItemDto,
  OrderReportItemDto,
  InventoryReportResponseDto,
  InventoryReportItemDto,
  RevenueReportResponseDto,
  ProductPerformanceResponseDto,
  ProductPerformanceItemDto,
} from './dto/vendor-report.dto';

@Injectable()
export class VendorReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
  ) { }

  /**
   * Get sales report grouped by day/week/month
   */
  async getSalesReport(
    vendorId: string,
    query: SalesReportQueryDto,
  ): Promise<SalesReportResponseDto> {
    const { dateFrom, dateTo, groupBy = GroupByPeriod.DAY } = query;
    const orders = await this.getVendorOrders(vendorId, dateFrom, dateTo);

    // Group orders by period
    const groupedData = new Map<string, { orders: number; revenue: number }>();

    for (const order of orders) {
      const periodKey = this.getPeriodKey(order.createdAt, groupBy);
      const existing = groupedData.get(periodKey) || { orders: 0, revenue: 0 };
      existing.orders += 1;
      existing.revenue += order.vendorTotal;
      groupedData.set(periodKey, existing);
    }

    const data: SalesReportItemDto[] = Array.from(groupedData.entries())
      .map(([date, stats]) => ({
        date,
        ordersCount: stats.orders,
        revenue: stats.revenue,
        averageOrderValue: stats.orders > 0 ? Math.round(stats.revenue / stats.orders) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.vendorTotal, 0);

    return {
      data,
      summary: {
        totalOrders,
        totalRevenue,
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        period: {
          from: dateFrom || 'all-time',
          to: dateTo || 'now',
        },
      },
    };
  }

  /**
   * Get orders report with optional CSV export
   */
  async getOrdersReport(
    vendorId: string,
    query: OrdersReportQueryDto,
  ): Promise<{ data: OrderReportItemDto[]; csv?: string }> {
    const { dateFrom, dateTo, status, format } = query;
    const orders = await this.getVendorOrders(vendorId, dateFrom, dateTo, status);

    const data: OrderReportItemDto[] = orders.map((order) => ({
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      date: order.createdAt,
      customer: order.customerName,
      items: order.itemCount,
      total: order.vendorTotal,
      status: order.status,
    }));

    if (format === 'csv') {
      const csv = this.generateCsv(data);
      return { data, csv };
    }

    return { data };
  }

  /**
   * Get inventory report
   */
  async getInventoryReport(
    vendorId: string,
    query: InventoryReportQueryDto,
  ): Promise<InventoryReportResponseDto> {
    const { stockStatus } = query;

    const whereClause: any = { vendorId };

    if (stockStatus === 'out') {
      whereClause.stock = 0;
    } else if (stockStatus === 'low') {
      whereClause.stock = { gt: 0, lte: 10 };
    } else if (stockStatus === 'in_stock') {
      whereClause.stock = { gt: 10 };
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        sku: true,
        stock: true,
        price: true,
        offerPrice: true,
      },
      orderBy: { stock: 'asc' },
    });

    const data: InventoryReportItemDto[] = products.map((product) => {
      const price = product.offerPrice || product.price;
      const value = product.stock * price;
      let status = 'in_stock';
      if (product.stock === 0) {
        status = 'out_of_stock';
      } else if (product.stock <= 10) {
        status = 'low';
      }

      return {
        productId: product.id,
        name: product.title,
        sku: product.sku || '',
        stock: product.stock,
        value,
        status,
      };
    });

    const outOfStock = data.filter((p) => p.status === 'out_of_stock').length;
    const lowStock = data.filter((p) => p.status === 'low').length;

    return {
      data,
      summary: {
        totalProducts: data.length,
        totalStock: data.reduce((sum, p) => sum + p.stock, 0),
        totalValue: data.reduce((sum, p) => sum + p.value, 0),
        outOfStock,
        lowStock,
      },
    };
  }

  /**
   * Get revenue breakdown report
   */
  async getRevenueReport(
    vendorId: string,
    query: DateRangeQueryDto,
  ): Promise<RevenueReportResponseDto> {
    const { dateFrom, dateTo } = query;
    const orders = await this.getVendorOrders(vendorId, dateFrom, dateTo);

    let grossSales = 0;
    let totalCommission = 0;
    let itemsSold = 0;

    for (const order of orders) {
      grossSales += order.vendorTotal;
      itemsSold += order.itemCount;

      // Estimate commission using rule resolution
      for (const item of order.items) {
        const itemTotal = (item.price || item.unitPrice || 0) * (item.quantity || 1);
        const commissionRate = await this.commissionService.resolveCommissionRate({
          categoryId: item.categoryId,
          vendorId,
          productId: item.productId,
        });
        // commissionRate is in basis points (bp): commission = itemTotal * bp / 10000
        totalCommission += Math.round((itemTotal * commissionRate) / 10000);
      }
    }

    const netEarnings = grossSales - totalCommission;
    const averageCommissionRate =
      grossSales > 0 ? (totalCommission / grossSales) * 100 : 0;

    return {
      grossSales,
      platformCommission: totalCommission,
      netEarnings,
      breakdown: {
        ordersCount: orders.length,
        itemsSold,
        averageCommissionRate: Math.round(averageCommissionRate * 100) / 100,
      },
      period: {
        from: dateFrom || 'all-time',
        to: dateTo || 'now',
      },
    };
  }

  /**
   * Get product performance report
   */
  async getProductsReport(
    vendorId: string,
    query: DateRangeQueryDto,
  ): Promise<ProductPerformanceResponseDto> {
    const { dateFrom, dateTo } = query;
    const orders = await this.getVendorOrders(vendorId, dateFrom, dateTo);

    // Aggregate by product
    const productStats = new Map<
      string,
      { name: string; sku: string; units: number; revenue: number; orders: Set<string> }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const productId = item.productId;
        if (!productId) continue;

        const existing = productStats.get(productId) || {
          name: item.productName || item.title || 'Unknown',
          sku: item.sku || '',
          units: 0,
          revenue: 0,
          orders: new Set<string>(),
        };

        existing.units += item.quantity || 1;
        existing.revenue += (item.price || item.unitPrice || 0) * (item.quantity || 1);
        existing.orders.add(order.id);
        productStats.set(productId, existing);
      }
    }

    const data: ProductPerformanceItemDto[] = Array.from(productStats.entries())
      .map(([productId, stats]) => ({
        productId,
        name: stats.name,
        sku: stats.sku,
        unitsSold: stats.units,
        revenue: stats.revenue,
        ordersCount: stats.orders.size,
        averagePrice: stats.units > 0 ? Math.round(stats.revenue / stats.units) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      data,
      summary: {
        totalProducts: data.length,
        totalUnitsSold: data.reduce((sum, p) => sum + p.unitsSold, 0),
        totalRevenue: data.reduce((sum, p) => sum + p.revenue, 0),
      },
      period: {
        from: dateFrom || 'all-time',
        to: dateTo || 'now',
      },
    };
  }

  /**
   * Helper: Get vendor orders with filtering
   */
  private async getVendorOrders(
    vendorId: string,
    dateFrom?: string,
    dateTo?: string,
    status?: string,
  ) {
    const whereClause: any = {};

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo);
      }
    }

    if (status) {
      whereClause.status = status as OrderStatus;
    }

    const allOrders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter to vendor items and compute vendor totals
    return allOrders
      .map((order) => {
        const items = Array.isArray(order.itemsSnapshot) ? (order.itemsSnapshot as any[]) : [];
        const vendorItems = items.filter((item: any) => item.vendorId === vendorId);

        if (vendorItems.length === 0) return null;

        const vendorTotal = vendorItems.reduce(
          (sum: number, item: any) =>
            sum + (item.price || item.unitPrice || 0) * (item.quantity || 1),
          0,
        );

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          status: order.status,
          customerName: order.user?.name || 'Guest',
          vendorTotal,
          itemCount: vendorItems.length,
          items: vendorItems,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        orderNumber: string | null;
        createdAt: Date;
        status: OrderStatus;
        customerName: string;
        vendorTotal: number;
        itemCount: number;
        items: any[];
      }>;
  }

  /**
   * Helper: Get period key for grouping
   */
  private getPeriodKey(date: Date, groupBy: GroupByPeriod): string {
    const d = new Date(date);

    switch (groupBy) {
      case GroupByPeriod.DAY:
        return d.toISOString().split('T')[0];

      case GroupByPeriod.WEEK: {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        return startOfWeek.toISOString().split('T')[0];
      }

      case GroupByPeriod.MONTH:
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      default:
        return d.toISOString().split('T')[0];
    }
  }

  /**
   * Helper: Generate CSV from order data
   */
  private generateCsv(data: OrderReportItemDto[]): string {
    const headers = ['Order ID', 'Order Number', 'Date', 'Customer', 'Items', 'Total', 'Status'];
    const rows = data.map((row) => [
      row.orderId,
      row.orderNumber,
      new Date(row.date).toISOString(),
      row.customer,
      row.items.toString(),
      row.total.toString(),
      row.status,
    ]);

    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ];

    return csvLines.join('\n');
  }
}
