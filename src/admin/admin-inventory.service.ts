import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminInventoryService {
  constructor(private prisma: PrismaService) {}

  async getInventoryOverview(filters: any) {
    const {
      vendorId,
      categoryId,
      lowStock,
      outOfStock,
      page = 1,
      limit = 50,
      search,
    } = filters;

    const where: any = {
      isActive: true,
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (lowStock === 'true' || lowStock === true) {
      where.stock = { lte: this.prisma.product.fields.lowStockThreshold };
    }

    if (outOfStock === 'true' || outOfStock === true) {
      where.stock = 0;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          title: true,
          sku: true,
          stock: true,
          lowStockThreshold: true,
          price: true,
          images: true,
          vendorId: true,
          categoryId: true,
          vendor: {
            select: {
              id: true,
              shopName: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const formattedItems = items.map((item) => ({
      id: item.id,
      name: item.title,
      sku: item.sku,
      stock: item.stock,
      reserved: 0, // TODO: Calculate from pending orders
      lowStockThreshold: item.lowStockThreshold || 10,
      price: item.price,
      image: Array.isArray(item.images) ? item.images[0] : null,
      vendorId: item.vendorId,
      vendorName: item.vendor?.shopName || 'Unknown',
      categoryId: item.categoryId,
      categoryName: item.category?.name || 'Uncategorized',
    }));

    return {
      items: formattedItems,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getLowStockItems(filters: any) {
    const where: any = {
      isActive: true,
      stock: { lte: 10 }, // Products with stock <= threshold
    };

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    const items = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        title: true,
        sku: true,
        stock: true,
        lowStockThreshold: true,
        price: true,
        images: true,
        vendor: {
          select: {
            id: true,
            shopName: true,
          },
        },
      },
      orderBy: { stock: 'asc' },
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.title,
        sku: item.sku,
        stock: item.stock,
        lowStockThreshold: item.lowStockThreshold || 10,
        vendorId: item.vendor.id,
        vendorName: item.vendor.shopName,
        image: Array.isArray(item.images) ? item.images[0] : null,
      })),
    };
  }

  async getStockMovements(filters: any) {
    const {
      productId,
      vendorId,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {
      action: { in: ['STOCK_ADJUST', 'STOCK_IN', 'STOCK_OUT'] },
    };

    if (productId) {
      where.entityId = productId;
    }

    if (vendorId) {
      where.details = {
        path: ['vendorId'],
        equals: vendorId,
      };
    }

    const [movements, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const formattedMovements = movements.map((m) => {
      const details = typeof m.details === 'string' ? JSON.parse(m.details) : m.details;
      return {
        id: m.id,
        productId: m.entityId,
        productName: details.productName || 'Unknown',
        quantity: details.quantity || 0,
        reason: details.reason,
        createdAt: m.createdAt,
        adminId: m.adminId,
        adminName: m.admin?.name || 'System',
      };
    });

    return {
      items: formattedMovements,
      total,
      page,
      limit,
    };
  }

  async adjustStock(
    adminId: string,
    productId: string,
    quantity: number,
    reason?: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        stock: true,
        vendorId: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const newStock = product.stock + quantity;

    if (newStock < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }

    // Update product stock
    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    // Log the adjustment
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'STOCK_ADJUST',
        entity: 'PRODUCT',
        entityId: productId,
        details: JSON.stringify({
          productName: product.title,
          previousStock: product.stock,
          newStock,
          quantity,
          reason,
          vendorId: product.vendorId,
        }),
      },
    });

    return {
      success: true,
      product: {
        id: updatedProduct.id,
        name: updatedProduct.title,
        stock: updatedProduct.stock,
      },
    };
  }

  async bulkAdjustStock(
    adminId: string,
    adjustments: Array<{ productId: string; quantity: number; reason?: string }>,
  ) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const adjustment of adjustments) {
      try {
        await this.adjustStock(
          adminId,
          adjustment.productId,
          adjustment.quantity,
          adjustment.reason,
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${adjustment.productId}: ${error.message}`,
        );
      }
    }

    return results;
  }

  async getInventoryStats(vendorId?: string) {
    const where: any = { isActive: true };
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [
      totalProducts,
      lowStockCount,
      outOfStockCount,
      products,
    ] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.count({
        where: { ...where, stock: { lte: 10 } },
      }),
      this.prisma.product.count({
        where: { ...where, stock: 0 },
      }),
      this.prisma.product.findMany({
        where,
        select: {
          stock: true,
          price: true,
        },
      }),
    ]);

    const totalValue = products.reduce(
      (sum, p) => sum + (p.stock * p.price),
      0,
    );

    return {
      totalProducts,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      totalValue,
    };
  }

  async getVendorInventory(vendorId: string, filters: any) {
    return this.getInventoryOverview({ ...filters, vendorId });
  }

  async updateLowStockThreshold(productId: string, threshold: number) {
    await this.prisma.product.update({
      where: { id: productId },
      data: { lowStockThreshold: threshold },
    });

    return {
      success: true,
      message: 'Low stock threshold updated',
    };
  }

  async exportInventoryCSV(filters: any) {
    const { items } = await this.getInventoryOverview({
      ...filters,
      limit: 10000,
    });

    const csv = [
      'SKU,Product,Vendor,Stock,Reserved,Available,Status,Value',
      ...items.map((item) =>
        [
          item.sku || item.id,
          `"${item.name}"`,
          `"${item.vendorName}"`,
          item.stock,
          item.reserved || 0,
          item.stock - (item.reserved || 0),
          item.stock === 0 ? 'Out of Stock' : item.stock <= item.lowStockThreshold ? 'Low Stock' : 'In Stock',
          item.stock * (item.price || 0),
        ].join(','),
      ),
    ].join('\n');

    return {
      csv,
      filename: `inventory-${new Date().toISOString().split('T')[0]}.csv`,
    };
  }
}
