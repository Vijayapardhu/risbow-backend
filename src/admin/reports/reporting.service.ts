import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Report types available in the system
 */
export enum ReportType {
  // Sales Reports
  SALES_SUMMARY = 'SALES_SUMMARY',
  SALES_BY_VENDOR = 'SALES_BY_VENDOR',
  SALES_BY_CATEGORY = 'SALES_BY_CATEGORY',
  SALES_BY_PRODUCT = 'SALES_BY_PRODUCT',
  SALES_BY_REGION = 'SALES_BY_REGION',

  // User Reports
  USER_GROWTH = 'USER_GROWTH',
  USER_ACTIVITY = 'USER_ACTIVITY',
  USER_RETENTION = 'USER_RETENTION',

  // Vendor Reports
  VENDOR_PERFORMANCE = 'VENDOR_PERFORMANCE',
  VENDOR_REVENUE = 'VENDOR_REVENUE',
  VENDOR_FULFILLMENT = 'VENDOR_FULFILLMENT',

  // Product Reports
  PRODUCT_PERFORMANCE = 'PRODUCT_PERFORMANCE',
  INVENTORY_STATUS = 'INVENTORY_STATUS',
  LOW_STOCK = 'LOW_STOCK',

  // Financial Reports
  REVENUE_SUMMARY = 'REVENUE_SUMMARY',
  COMMISSION_REPORT = 'COMMISSION_REPORT',
  REFUND_REPORT = 'REFUND_REPORT',
  PAYOUT_REPORT = 'PAYOUT_REPORT',

  // Coin Reports
  COIN_CIRCULATION = 'COIN_CIRCULATION',
  COIN_REDEMPTION = 'COIN_REDEMPTION',

  // Platform Reports
  PLATFORM_OVERVIEW = 'PLATFORM_OVERVIEW',
  MODERATION_REPORT = 'MODERATION_REPORT',
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface ReportParams {
  type: ReportType;
  dateRange: DateRange;
  filters?: Record<string, any>;
  groupBy?: string;
  limit?: number;
}

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a report based on type
   */
  async generateReport(params: ReportParams) {
    const { type, dateRange, filters, groupBy, limit } = params;

    switch (type) {
      case ReportType.SALES_SUMMARY:
        return this.getSalesSummary(dateRange);

      case ReportType.SALES_BY_VENDOR:
        return this.getSalesByVendor(dateRange, limit);

      case ReportType.SALES_BY_CATEGORY:
        return this.getSalesByCategory(dateRange, limit);

      case ReportType.SALES_BY_PRODUCT:
        return this.getSalesByProduct(dateRange, limit);

      case ReportType.USER_GROWTH:
        return this.getUserGrowth(dateRange, groupBy);

      case ReportType.VENDOR_PERFORMANCE:
        return this.getVendorPerformance(dateRange, filters?.vendorId);

      case ReportType.REVENUE_SUMMARY:
        return this.getRevenueSummary(dateRange);

      case ReportType.COIN_CIRCULATION:
        return this.getCoinCirculation(dateRange);

      case ReportType.PLATFORM_OVERVIEW:
        return this.getPlatformOverview(dateRange);

      case ReportType.LOW_STOCK:
        return this.getLowStockReport(filters?.threshold || 10);

      default:
        throw new Error(`Report type ${type} not implemented`);
    }
  }

  /**
   * Sales Summary Report
   */
  async getSalesSummary(dateRange: DateRange) {
    const { startDate, endDate } = dateRange;

    // Get order statistics
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Group by status
    const byStatus: Record<string, { count: number; revenue: number }> = {};
    for (const order of orders) {
      if (!byStatus[order.status]) {
        byStatus[order.status] = { count: 0, revenue: 0 };
      }
      byStatus[order.status].count++;
      byStatus[order.status].revenue += order.totalAmount;
    }

    // Group by date
    const byDate: Record<string, { count: number; revenue: number }> = {};
    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { count: 0, revenue: 0 };
      }
      byDate[dateKey].count++;
      byDate[dateKey].revenue += order.totalAmount;
    }

    // Get comparison with previous period
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime() - 1);

    const prevOrders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: prevStartDate,
          lte: prevEndDate,
        },
      },
      select: {
        totalAmount: true,
      },
    });

    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const revenueGrowth = prevRevenue > 0
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
      : 0;

    return {
      summary: {
        totalRevenue,
        orderCount,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      },
      byStatus,
      byDate: Object.entries(byDate)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({ date, ...data })),
    };
  }

  /**
   * Sales by Vendor Report
   */
  async getSalesByVendor(dateRange: DateRange, limit = 20) {
    const { startDate, endDate } = dateRange;

    const vendorSales = await this.prisma.orderItem.groupBy({
      by: ['vendorId'],
      where: {
        Order: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: {
        total: true,
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: limit,
    });

    // Fetch vendor details
    const vendorIds = vendorSales
      .filter((v) => v.vendorId)
      .map((v) => v.vendorId as string);

    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, storeName: true },
    });

    const vendorMap = new Map(vendors.map((v) => [v.id, v]));

    return vendorSales.map((v) => ({
      vendorId: v.vendorId,
      vendorName: v.vendorId ? vendorMap.get(v.vendorId)?.storeName : 'Unknown',
      totalRevenue: v._sum.total || 0,
      totalQuantity: v._sum.quantity || 0,
      orderItemCount: v._count.id,
    }));
  }

  /**
   * Sales by Category Report
   */
  async getSalesByCategory(dateRange: DateRange, limit = 20) {
    const { startDate, endDate } = dateRange;

    // This requires a more complex query through products
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        Order: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        Product: {
          select: {
            categoryId: true,
            Category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const categoryStats: Record<string, { name: string; revenue: number; quantity: number; count: number }> = {};

    for (const item of orderItems) {
      const categoryId = item.Product?.categoryId || 'uncategorized';
      const categoryName = item.Product?.Category?.name || 'Uncategorized';

      if (!categoryStats[categoryId]) {
        categoryStats[categoryId] = { name: categoryName, revenue: 0, quantity: 0, count: 0 };
      }

      categoryStats[categoryId].revenue += item.total;
      categoryStats[categoryId].quantity += item.quantity;
      categoryStats[categoryId].count++;
    }

    return Object.entries(categoryStats)
      .map(([id, data]) => ({ categoryId: id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /**
   * Sales by Product Report
   */
  async getSalesByProduct(dateRange: DateRange, limit = 50) {
    const { startDate, endDate } = dateRange;

    const productSales = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        Order: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: {
        total: true,
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: limit,
    });

    const productIds = productSales.map((p) => p.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return productSales.map((p) => ({
      productId: p.productId,
      productName: productMap.get(p.productId)?.name || 'Unknown',
      sku: productMap.get(p.productId)?.sku || '',
      totalRevenue: p._sum.total || 0,
      totalQuantity: p._sum.quantity || 0,
      orderCount: p._count.id,
    }));
  }

  /**
   * User Growth Report
   */
  async getUserGrowth(dateRange: DateRange, groupBy = 'day') {
    const { startDate, endDate } = dateRange;

    const users = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by time period
    const grouped: Record<string, number> = {};

    for (const user of users) {
      let key: string;
      const date = user.createdAt;

      switch (groupBy) {
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        default: // day
          key = date.toISOString().split('T')[0];
      }

      grouped[key] = (grouped[key] || 0) + 1;
    }

    // Get totals
    const totalUsers = await this.prisma.user.count();
    const newUsers = users.length;
    const activeUsers = await this.prisma.user.count({
      where: {
        status: 'ACTIVE',
      },
    });

    return {
      summary: {
        totalUsers,
        newUsers,
        activeUsers,
        growthRate: totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0,
      },
      timeline: Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, count]) => ({ period, count })),
    };
  }

  /**
   * Vendor Performance Report
   */
  async getVendorPerformance(dateRange: DateRange, vendorId?: string) {
    const { startDate, endDate } = dateRange;

    const where: Prisma.VendorWhereInput = vendorId ? { id: vendorId } : {};

    const vendors = await this.prisma.vendor.findMany({
      where,
      select: {
        id: true,
        storeName: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            Product: true,
            // orders field doesn't exist on Vendor
            // OrderItem: {
            //   where: {
            //     Order: {
            //       createdAt: {
            //         gte: startDate,
            //         lte: endDate,
            //       },
            //     },
            //   },
            // },
          },
        },
      },
    });

    // Get order stats for each vendor
    const vendorStats = await Promise.all(
      vendors.map(async (vendor) => {
        // Note: Order model doesn't have vendorId field
        // Orders need to be queried through OrderItems
        const orderItems = await this.prisma.orderItem.findMany({
          where: {
            vendorId: vendor.id,
            Order: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
          include: {
            Order: {
              select: {
                totalAmount: true,
                status: true,
              },
            },
          },
        });

        const orders = orderItems.map(item => item.Order);
        const totalRevenue = orderItems.reduce((sum, item) => sum + item.total, 0);
        const completedOrders = orders.filter((o) => o.status === 'DELIVERED').length;
        const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;
        const fulfillmentRate = orders.length > 0
          ? (completedOrders / orders.length) * 100
          : 0;

        // Get average rating
        const reviews = await this.prisma.review.aggregate({
          where: {
            Product: { vendorId: vendor.id },
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _avg: { rating: true },
          _count: { id: true },
        });

        return {
          vendorId: vendor.id,
          vendorName: vendor.storeName,
          isActive: vendor.isActive,
          productCount: vendor._count.Product,
          orderCount: orders.length,
          totalRevenue,
          completedOrders,
          cancelledOrders,
          fulfillmentRate: Math.round(fulfillmentRate * 100) / 100,
          avgRating: reviews._avg.rating || 0,
          reviewCount: reviews._count.id,
        };
      }),
    );

    return vendorStats.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Revenue Summary Report
   */
  async getRevenueSummary(dateRange: DateRange) {
    const { startDate, endDate } = dateRange;

    // Total revenue from orders
    const orderRevenue = await this.prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    });

    // Commission earned (if applicable)
    // NOTE: This is a placeholder estimate. For real reporting, sum OrderFinancialSnapshot.platformEarnings.
    const commissionRateBp = 1000; // 10% => 1000bp
    const totalCommission = Math.round(((orderRevenue._sum.totalAmount || 0) * commissionRateBp) / 10000);

    // Refunds
    const refunds = await this.prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'REFUNDED',
      },
      _sum: { totalAmount: true },
    });

    // Banner revenue
    const bannerRevenue = await this.prisma.bannerMetric.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { cost: true },
    });

    return {
      grossRevenue: orderRevenue._sum.totalAmount || 0,
      commissionEarned: Math.round(totalCommission * 100) / 100,
      refunds: refunds._sum.totalAmount || 0,
      bannerRevenue: bannerRevenue._sum.cost || 0,
      netRevenue: Math.round(
        (totalCommission + (bannerRevenue._sum.cost || 0) - (refunds._sum.totalAmount || 0)) * 100,
      ) / 100,
    };
  }

  /**
   * Coin Circulation Report
   */
  async getCoinCirculation(dateRange: DateRange) {
    const { startDate, endDate } = dateRange;

    const transactions = await this.prisma.coinTransaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalEarned = 0;
    let totalRedeemed = 0;
    const byType: Record<string, { count: number; amount: number }> = {};

    for (const tx of transactions) {
      if (tx.amount > 0) {
        totalEarned += tx.amount;
      } else {
        totalRedeemed += Math.abs(tx.amount);
      }

      if (!byType[tx.type]) {
        byType[tx.type] = { count: 0, amount: 0 };
      }
      byType[tx.type].count++;
      byType[tx.type].amount += tx.amount;
    }

    // Get current total circulation
    const totalCirculation = await this.prisma.user.aggregate({
      _sum: { coinsBalance: true },
    });

    return {
      summary: {
        totalCirculation: totalCirculation._sum.coinsBalance || 0,
        periodEarned: totalEarned,
        periodRedeemed: totalRedeemed,
        netChange: totalEarned - totalRedeemed,
      },
      byType,
    };
  }

  /**
   * Platform Overview Report
   */
  async getPlatformOverview(dateRange: DateRange) {
    const { startDate, endDate } = dateRange;

    const [
      totalUsers,
      newUsers,
      activeVendors,
      newVendors,
      totalProducts,
      activeProducts,
      orders,
      revenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.vendor.count({ where: { isActive: true } }),
      this.prisma.vendor.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.order.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: startDate, lte: endDate } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        new: newUsers,
      },
      vendors: {
        active: activeVendors,
        new: newVendors,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      orders: {
        count: orders,
        revenue: revenue._sum.totalAmount || 0,
      },
    };
  }

  /**
   * Low Stock Report
   */
  async getLowStockReport(threshold = 10) {
    return this.prisma.product.findMany({
      where: {
        stock: { lte: threshold },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        Vendor: { select: { id: true, storeName: true } },
      },
      orderBy: { stock: 'asc' },
    });
  }

  /**
   * Export report data
   */
  async exportReport(params: ReportParams, format: 'json' | 'csv' = 'json') {
    const data = await this.generateReport(params);

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  private convertToCSV(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0]);
      const rows = data.map((row) =>
        headers.map((h) => JSON.stringify(row[h] ?? '')).join(','),
      );

      return [headers.join(','), ...rows].join('\n');
    }

    // For nested objects, flatten to array
    return JSON.stringify(data);
  }
}


