import { Controller, Get, Param, Query, UseGuards, Post, Body, Request, BadRequestException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRole, OrderStatus } from '@prisma/client';
import { generateOrderNumber } from '../common/order-number.utils';

/**
 * Backward-compatible alias routes for older admin clients.
 * Prefer using `/admin/orders`.
 */
@Controller('orders/admin')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class AdminOrdersAliasController {
  private readonly logger = new Logger(AdminOrdersAliasController.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService
  ) { }

  @Get('pos/history')
  async getPosHistory(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    const result = await this.ordersService.findAllOrders({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search,
    });

    // Map to POSOrder format expected by frontend
    return {
      ...result,
      data: result.data.map(order => ({
        ...order,
        cashierId: (order as any).agentId || 'admin',
        cashierName: 'Admin', // Should fetch user name if possible
      }))
    };
  }

  @Get('pos/analytics')
  async getPosAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: any = {
      agentId: { not: null },
      status: { not: 'CANCELLED' } as any
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    try {
      const [
        totalAgg,
        refundsAgg,
        paymentStats,
        productStats,
        timelineOrders
      ] = await Promise.all([
        // 1. Total Sales & Orders
        this.prisma.order.aggregate({
          where,
          _sum: { totalAmount: true },
          _count: { id: true }
        }),
        // 2. Refunds (linked to POS orders)
        this.prisma.refund.aggregate({
          where: {
            Order: { agentId: { not: null } },
            createdAt: startDate && endDate ? {
              gte: new Date(startDate),
              lte: new Date(endDate)
            } : undefined
          },
          _sum: { amount: true }
        }),
        // 3. Sales by Payment Method
        // Note: GroupBy is not directly supported on relations in all Prisma versions in the way we want (Order.payment.provider).
        // We'll query Payment table directly, filtering by associated Order.
        this.prisma.payment.groupBy({
          by: ['provider'],
          where: {
            Order: where,
            status: 'SUCCESS' as any
          },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // 4. Top Products
        this.prisma.orderItem.groupBy({
          by: ['productId'],
          where: {
            Order: where
          },
          _sum: { quantity: true, total: true },
          orderBy: {
            _sum: { quantity: 'desc' }
          },
          take: 10
        }),
        // 5. Timeline (for Sales by Hour)
        this.prisma.order.findMany({
          where,
          select: { createdAt: true, totalAmount: true }
        })
      ]);

      // Process data (Convert Paise to Rupees)
      const totalSales = (totalAgg._sum.totalAmount || 0) / 100;
      const totalOrders = totalAgg._count.id || 0;
      const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
      const totalRefunds = (refundsAgg._sum.amount || 0) / 100;

      // Process Payment Methods
      const salesByPaymentMethod: Record<string, number> = {};
      paymentStats.forEach(p => {
        // Normalized keys: CASH, CARD, UPI, etc.
        const key = p.provider ? p.provider.toUpperCase() : 'UNKNOWN';
        salesByPaymentMethod[key] = (salesByPaymentMethod[key] || 0) + ((p._sum.amount || 0) / 100);
      });

      // Process Timeline (Sales by Hour)
      // Initialize 24 hours
      const salesByHour = Array(24).fill(0);
      timelineOrders.forEach(o => {
        const hour = new Date(o.createdAt).getHours();
        if (hour >= 0 && hour < 24) {
          salesByHour[hour] += (o.totalAmount || 0) / 100; // Amount in Rupees
        }
      });

      // Fetch Product Names for Top Products
      const productIds = productStats.map(p => p.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true, images: true }
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      const topProducts = productStats.map(p => {
        const product = productMap.get(p.productId);
        return {
          id: p.productId,
          name: product?.title || 'Unknown Product',
          image: product?.images?.[0] || '',
          quantity: p._sum.quantity || 0,
          revenue: (p._sum.total || 0) / 100 // Renamed sales->revenue and converted to Rupees
        };
      });

      return {
        totalSales,
        totalOrders,
        averageOrderValue: avgOrderValue,
        totalRefunds,
        salesByPaymentMethod,
        salesByHour: salesByHour.map((amount, hour) => ({ hour, sales: amount })),
        topProducts
      };

    } catch (error) {
      this.logger.error(`Failed to fetch POS analytics: ${error.message}`, error.stack);
      // Fallback to zeros on error
      return {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalRefunds: 0,
        salesByPaymentMethod: { CASH: 0, CARD: 0, UPI: 0 },
        salesByHour: [],
        topProducts: []
      };
    }
  }

  @Get('pos/customer')
  async getCustomerByMobile(@Query('mobile') mobile: string) {
    if (!mobile) throw new BadRequestException('Mobile number is required');

    const user = await this.prisma.user.findUnique({
      where: { mobile },
      select: {
        id: true,
        name: true,
        mobile: true,
        coinsBalance: true,
        email: true
      }
    });

    if (!user) {
      throw new NotFoundException('Customer not found');
    }
    return user;
  }

  @Post('pos/customers')
  async createPosCustomer(@Body() data: { mobile: string; name: string; email?: string }) {
    const startTime = Date.now();
    let { mobile, name, email } = data;

    if (!mobile || !name) {
      throw new BadRequestException('Mobile and Name are required');
    }

    // 1. Input Normalization
    mobile = mobile.trim();
    name = name.trim();
    if (email) email = email.trim();

    this.logger.log(`[CreatePosCustomer] Attempting to create customer. Mobile: ${mobile}, Name: ${name}`);

    try {
      // 2. Initial Check (Read)
      const existing = await this.prisma.user.findUnique({ where: { mobile } });
      if (existing) {
        this.logger.log(`[CreatePosCustomer] Customer already exists. Returning existing record. Mobile: ${mobile}, ID: ${existing.id}`);
        return existing;
      }

      // 3. Create (Write)
      const newUser = await this.prisma.user.create({
        data: {
          id: randomUUID(),
          mobile,
          name,
          email,
          role: 'CUSTOMER',
          coinsBalance: 0,
          referralCode: `POS${Math.floor(1000 + Math.random() * 9000)}`
        }
      });

      this.logger.log(`[CreatePosCustomer] Successfully created customer. ID: ${newUser.id}, Time: ${Date.now() - startTime}ms`);
      return newUser;

    } catch (error) {
      // 4. Race Condition Handling
      if (error.code === 'P2002') { // Prisma Unique Constraint Violation
        this.logger.warn(`[CreatePosCustomer] Race condition detected for mobile: ${mobile}. Retrying lookup.`);

        // Retry lookup to confirm it's a duplicate and not a ghost error
        const racedUser = await this.prisma.user.findUnique({ where: { mobile } });

        if (racedUser) {
          this.logger.log(`[CreatePosCustomer] Resolved race condition. Returning existing record. Mobile: ${mobile}, ID: ${racedUser.id}`);
          return racedUser;
        } else {
          // This shouldn't happen in standard isolation levels unless it's a phantom read issue or unique index corruption
          this.logger.error(`[CreatePosCustomer] Critical: Unique constraint failed but user not found on retry. Mobile: ${mobile}`);
          throw new InternalServerErrorException('Failed to create customer due to database consistency error. Please try again.');
        }
      }

      this.logger.error(`[CreatePosCustomer] Unexpected error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('pos/orders')
  async createPosOrder(@Body() data: any, @Request() req: any) {
    const { items, customerId, paymentMethod, amountReceived, changeGiven, subtotal, tax, total, discount, customerMobile, customerName } = data;

    let targetUserId: string = customerId;

    // Logic: If no ID, check mobile. If mobile exists, use user. If not, create user.
    if (!targetUserId) {
      if (customerMobile) {
        // Robust find-or-create with race condition handling
        targetUserId = await this._findOrCreatePosUser(customerMobile.trim(), customerName?.trim());
      } else {
        // Fallback to generic walk-in only if no mobile provided
        targetUserId = await this._getWalkInUser();
      }
    }

    // 1. Fetch products to get vendor IDs
    const productIds = items.map((item: any) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, vendorId: true }
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // 2. Group Items by Vendor
    const itemsByVendor = new Map<string, any[]>();
    for (const item of items) {
      const product = productMap.get(item.productId);
      const vendorId = product?.vendorId || item.vendorId;

      if (!vendorId) {
        throw new BadRequestException(`Vendor ID missing for product ${item.productId}`);
      }

      if (!itemsByVendor.has(vendorId)) {
        itemsByVendor.set(vendorId, []);
      }
      itemsByVendor.get(vendorId).push(item);
    }

    const createdOrders = [];

    // 3. Create Orders and Update Inventory atomically
    await this.prisma.$transaction(async (tx) => {
      // 3a. Verify stock availability before creating orders
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, stock: true, title: true }
        });
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.title}": requested ${item.quantity}, available ${product.stock}`
          );
        }
      }

      // 3b. Create Order per Vendor
      for (const [vendorId, vendorItems] of itemsByVendor) {
        let orderSubtotal = 0;
        let orderTax = 0;
        let orderTotal = 0;

        const orderItemsData = vendorItems.map((item: any) => {
          const quantity = item.quantity;
          const price = item.unitPrice;
          const itemSubtotal = price * quantity;
          const itemTax = Math.round(itemSubtotal * 0.18);
          const itemTotal = itemSubtotal + itemTax;

          orderSubtotal += itemSubtotal;
          orderTax += itemTax;
          orderTotal += itemTotal;

          return {
            productId: item.productId,
            vendorId: vendorId,
            quantity: quantity,
            price: price,
            subtotal: itemSubtotal,
            tax: itemTax,
            total: itemTotal,
            status: 'DELIVERED'
          };
        });

        const order = await tx.order.create({
          data: {
            id: `ord_pos_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            orderNumber: await generateOrderNumber(tx as any),
            userId: targetUserId,
            status: 'DELIVERED',
            totalAmount: orderTotal,

            itemsSnapshot: vendorItems,
            agentId: req.user.id,

            OrderItem: {
              create: orderItemsData
            },
            payment: {
              create: {
                id: randomUUID(),
                amount: orderTotal,
                provider: (paymentMethod || 'CASH').toUpperCase(),
                currency: 'INR',
                status: 'SUCCESS',
                paymentId: `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`
              }
            }
          },
          include: {
            OrderItem: {
              include: { Product: true }
            }
          }
        });

        createdOrders.push(order);
      }

      // 3c. Update Inventory (stock decrement) atomically
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }
    });

    // 5. Map to POSOrder structure expected by frontend
    const mappedOrders = await Promise.all(createdOrders.map(async (order) => {
      const user = await this.prisma.user.findUnique({
        where: { id: order.userId },
        select: { id: true, name: true, email: true, mobile: true, coinsBalance: true }
      });

      // Calculate totals from items if not directly available
      const orderItems = order.OrderItem || [];
      const calculatedSubtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const calculatedTax = orderItems.reduce((sum, item) => sum + (item.tax || 0), 0);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customer: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.mobile,
          coinsBalance: user.coinsBalance
        } : null,
        items: orderItems.map((oi: any) => ({
          id: oi.id,
          product: {
            id: oi.Product?.id || oi.productId,
            name: oi.Product?.title || oi.Product?.name || 'Product',
            sku: oi.Product?.sku || '',
            barcode: oi.Product?.sku || '',
            price: oi.Product?.price || 0,
            salePrice: oi.Product?.offerPrice || oi.Product?.price || 0,
            imageUrl: oi.Product?.images?.[0] || '',
            stock: oi.Product?.stock || 0,
            category: oi.Product?.categoryName || 'Uncategorized',
            description: oi.Product?.description,
            vendorId: oi.Product?.vendorId
          },
          quantity: oi.quantity,
          unitPrice: oi.price,
          total: oi.total || ((oi.price * oi.quantity) + (oi.tax || 0)),
          refundedQuantity: 0
        })),
        subtotal: calculatedSubtotal,
        discount: discount || 0,
        tax: calculatedTax,
        total: order.totalAmount,
        status: order.status,
        paymentMethod: paymentMethod,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        cashierId: order.agentId,
        cashierName: req.user?.name || 'Admin',
      };
    }));

    return mappedOrders;
  }

  @Get('all')
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('status') status: OrderStatus,
  ) {
    return this.ordersService.findAllOrders({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search,
      status,
    });
  }

  @Get('pos/:id')
  async getPosOrderById(@Param('id') id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        OrderItem: {
          include: { Product: true }
        },
        payment: true,
        user: true
      }
    });

    if (!order) {
      throw new NotFoundException(`POS order with ID ${id} not found`);
    }

    // Map to POSOrder structure expected by frontend
    const orderItems = order.OrderItem || [];
    const calculatedSubtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const calculatedTax = orderItems.reduce((sum, item) => sum + (item.tax || 0), 0);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.user ? {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
        phone: order.user.mobile,
        coinsBalance: order.user.coinsBalance
      } : null,
      items: orderItems.map((oi: any) => ({
        id: oi.id,
        product: {
          id: oi.Product?.id || oi.productId,
          name: oi.Product?.title || oi.Product?.name || 'Product',
          sku: oi.Product?.sku || '',
          barcode: oi.Product?.sku || '',
          price: oi.Product?.price || 0,
          salePrice: oi.Product?.offerPrice || oi.Product?.price || 0,
          imageUrl: oi.Product?.images?.[0] || '',
          stock: oi.Product?.stock || 0,
          category: oi.Product?.categoryName || 'Uncategorized',
          description: oi.Product?.description,
          vendorId: oi.Product?.vendorId
        },
        quantity: oi.quantity,
        unitPrice: oi.price,
        total: oi.total || ((oi.price * oi.quantity) + (oi.tax || 0)),
        refundedQuantity: 0
      })),
      subtotal: calculatedSubtotal,
      tax: calculatedTax,
      total: order.totalAmount,
      status: order.status,
      paymentMethod: order.payment?.[0]?.provider || 'CASH',
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      cashierId: order.agentId,
      cashierName: 'Admin', // Should fetch from user relation if needed
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.getOrderDetail(id);
  }

  // --- Helper Methods for Concurrency Handling ---

  private async _findOrCreatePosUser(mobile: string, name?: string): Promise<string> {
    try {
      // 1. Try to find
      const existing = await this.prisma.user.findUnique({ where: { mobile } });
      if (existing) return existing.id;

      // 2. Try to create
      const newUser = await this.prisma.user.create({
        data: {
          id: randomUUID(),
          mobile,
          name: name || 'Walk-in Customer',
          role: 'CUSTOMER',
          coinsBalance: 0,
          referralCode: `POS${Math.floor(1000 + Math.random() * 9000)}`
        }
      });
      return newUser.id;

    } catch (error) {
      if (error.code === 'P2002') {
        this.logger.warn(`[_findOrCreatePosUser] Race condition for mobile ${mobile}. Retrying lookup.`);
        // Retry lookup
        const retryFound = await this.prisma.user.findUnique({ where: { mobile } });
        if (retryFound) return retryFound.id;

        throw new InternalServerErrorException('Failed to resolve customer race condition');
      }
      throw error;
    }
  }

  private async _getWalkInUser(): Promise<string> {
    const WALK_IN_MOBILE = '0000000000';
    return this._findOrCreatePosUser(WALK_IN_MOBILE, 'Walk-in Customer');
  }
}
