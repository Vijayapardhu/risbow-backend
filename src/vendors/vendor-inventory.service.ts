import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  InventoryProductDto,
  InventorySummaryDto,
  LowStockAlertDto,
  CategoryValuationDto,
  InventoryValuationDto,
  InventoryFilterDto,
  BulkStockUpdateDto,
  SingleStockUpdateDto,
  UpdateThresholdDto,
} from './dto/vendor-inventory.dto';

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class VendorInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private getStockStatus(
    stock: number,
    threshold: number,
  ): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
    if (stock === 0) return 'OUT_OF_STOCK';
    if (stock <= threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  async getInventoryOverview(
    vendorId: string,
    filters: InventoryFilterDto,
  ): Promise<InventoryProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: { vendorId },
      include: {
        Category: { select: { name: true } },
      },
      orderBy: { stock: filters.sortOrder || 'asc' },
    });

    let inventoryProducts: InventoryProductDto[] = products.map((p) => {
      const threshold = DEFAULT_LOW_STOCK_THRESHOLD;
      return {
        productId: p.id,
        name: p.title,
        currentStock: p.stock,
        lowStockThreshold: threshold,
        status: this.getStockStatus(p.stock, threshold),
        sku: p.sku || undefined,
        categoryName: p.Category?.name,
      };
    });

    if (filters.lowStock) {
      inventoryProducts = inventoryProducts.filter(
        (p) => p.status === 'LOW_STOCK',
      );
    }

    if (filters.outOfStock) {
      inventoryProducts = inventoryProducts.filter(
        (p) => p.status === 'OUT_OF_STOCK',
      );
    }

    return inventoryProducts;
  }

  async getLowStockAlerts(vendorId: string): Promise<LowStockAlertDto> {
    const products = await this.prisma.product.findMany({
      where: {
        vendorId,
        stock: { lte: DEFAULT_LOW_STOCK_THRESHOLD },
      },
      include: {
        Category: { select: { name: true } },
      },
      orderBy: { stock: 'asc' },
    });

    const alertProducts: InventoryProductDto[] = products.map((p) => {
      const threshold = DEFAULT_LOW_STOCK_THRESHOLD;
      return {
        productId: p.id,
        name: p.title,
        currentStock: p.stock,
        lowStockThreshold: threshold,
        status: this.getStockStatus(p.stock, threshold),
        sku: p.sku || undefined,
        categoryName: p.Category?.name,
      };
    });

    return {
      count: alertProducts.length,
      products: alertProducts,
    };
  }

  async bulkUpdateStock(
    vendorId: string,
    dto: BulkStockUpdateDto,
  ): Promise<{ updated: number; failed: string[] }> {
    const productIds = dto.updates.map((u) => u.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        vendorId,
      },
      select: { id: true },
    });

    const validProductIds = new Set(products.map((p) => p.id));
    const failed: string[] = [];
    let updated = 0;

    for (const update of dto.updates) {
      if (!validProductIds.has(update.productId)) {
        failed.push(update.productId);
        continue;
      }

      const updateData: { stock: number; visibility?: 'DRAFT' } = { stock: update.stock };
      if (update.stock === 0) {
        updateData.visibility = 'DRAFT';
      }
      await this.prisma.product.update({
        where: { id: update.productId },
        data: updateData,
      });
      updated++;
    }

    return { updated, failed };
  }

  async updateSingleStock(
    vendorId: string,
    productId: string,
    dto: SingleStockUpdateDto,
  ): Promise<{ success: boolean; product: InventoryProductDto }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId },
      include: { Category: { select: { name: true } } },
    });

    if (!product) {
      throw new NotFoundException(
        `Product ${productId} not found or does not belong to vendor`,
      );
    }

    const updateData: { stock: number; visibility?: 'DRAFT' } = { stock: dto.stock };
    if (dto.stock === 0) {
      updateData.visibility = 'DRAFT';
    }
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: { Category: { select: { name: true } } },
    });

    const threshold = DEFAULT_LOW_STOCK_THRESHOLD;

    return {
      success: true,
      product: {
        productId: updated.id,
        name: updated.title,
        currentStock: updated.stock,
        lowStockThreshold: threshold,
        status: this.getStockStatus(updated.stock, threshold),
        sku: updated.sku || undefined,
        categoryName: updated.Category?.name,
      },
    };
  }

  async updateThreshold(
    vendorId: string,
    productId: string,
    dto: UpdateThresholdDto,
  ): Promise<{ success: boolean; message: string }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId },
    });

    if (!product) {
      throw new NotFoundException(
        `Product ${productId} not found or does not belong to vendor`,
      );
    }

    // Note: Product model doesn't have lowStockThreshold field
    // This would require storing in vendor settings or adding to Product model
    // For now, return success with a note
    return {
      success: true,
      message: `Threshold would be set to ${dto.lowStockThreshold}. Consider adding lowStockThreshold field to Product model.`,
    };
  }

  async getInventoryValuation(
    vendorId: string,
  ): Promise<InventoryValuationDto> {
    const products = await this.prisma.product.findMany({
      where: { vendorId },
      include: {
        Category: { select: { id: true, name: true } },
      },
    });

    const categoryMap = new Map<
      string,
      { categoryName: string; totalValue: number; productCount: number }
    >();
    let totalValue = 0;

    for (const product of products) {
      const productValue = product.stock * product.price;
      totalValue += productValue;

      const categoryId = product.categoryId;
      const categoryName = product.Category?.name || 'Unknown';

      if (categoryMap.has(categoryId)) {
        const cat = categoryMap.get(categoryId)!;
        cat.totalValue += productValue;
        cat.productCount++;
      } else {
        categoryMap.set(categoryId, {
          categoryName,
          totalValue: productValue,
          productCount: 1,
        });
      }
    }

    const breakdown: CategoryValuationDto[] = Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.categoryName,
        totalValue: data.totalValue,
        productCount: data.productCount,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return { totalValue, breakdown };
  }

  async checkLowStock(vendorId: string): Promise<InventoryProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        vendorId,
        stock: { lte: DEFAULT_LOW_STOCK_THRESHOLD },
      },
      include: {
        Category: { select: { name: true } },
      },
    });

    return products.map((p) => {
      const threshold = DEFAULT_LOW_STOCK_THRESHOLD;
      return {
        productId: p.id,
        name: p.title,
        currentStock: p.stock,
        lowStockThreshold: threshold,
        status: this.getStockStatus(p.stock, threshold),
        sku: p.sku || undefined,
        categoryName: p.Category?.name,
      };
    });
  }

  async autoDisableOutOfStock(
    vendorId: string,
  ): Promise<{ disabled: number; productIds: string[] }> {
    const outOfStockProducts = await this.prisma.product.findMany({
      where: {
        vendorId,
        stock: 0,
        visibility: { not: 'DRAFT' },
      },
      select: { id: true },
    });

    const productIds = outOfStockProducts.map((p) => p.id);

    if (productIds.length > 0) {
      await this.prisma.product.updateMany({
        where: {
          id: { in: productIds },
        },
        data: { visibility: 'DRAFT' },
      });
    }

    return { disabled: productIds.length, productIds };
  }

  async getInventorySummary(vendorId: string): Promise<InventorySummaryDto> {
    const products = await this.prisma.product.findMany({
      where: { vendorId },
      select: { stock: true },
    });

    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const product of products) {
      const status = this.getStockStatus(
        product.stock,
        DEFAULT_LOW_STOCK_THRESHOLD,
      );
      if (status === 'IN_STOCK') inStockCount++;
      else if (status === 'LOW_STOCK') lowStockCount++;
      else outOfStockCount++;
    }

    return {
      totalProducts: products.length,
      inStockCount,
      lowStockCount,
      outOfStockCount,
    };
  }
}

