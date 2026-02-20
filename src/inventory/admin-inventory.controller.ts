import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin - Inventory')
@Controller('admin/inventory')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
@ApiBearerAuth()
export class AdminInventoryController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory items (Products)' })
  async findAll(
    @Query() query: { page?: number; limit?: number; search?: string; lowStock?: boolean; outOfStock?: boolean; vendorId?: string }
  ) {
    const { page = 1, limit = 10, search, lowStock, outOfStock, vendorId } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (vendorId) {
        where.vendorId = vendorId;
    }

    if (outOfStock) {
      where.stock = 0;
    } else if (lowStock) {
      where.stock = { gt: 0, lte: 10 }; // Using 10 as default reorder point
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          Vendor: { select: { id: true, storeName: true, name: true } },
          Category: { select: { id: true, name: true } }
        },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    return {
      data: data.map(item => ({
        id: item.id, // Using Product ID as the main identifier
        productId: item.id,
        productName: item.title,
        sku: item.sku,
        stock: item.stock,
        reservedStock: 0, // Not tracking reserved in this view
        availableStock: item.stock,
        reorderPoint: 10,
        reorderQuantity: 50,
        vendorId: item.vendorId,
        vendorName: item.Vendor?.storeName || item.Vendor?.name,
        warehouseName: 'Vendor Managed', // Placeholder
        lastUpdated: item.updatedAt
      })),
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory statistics' })
  async getStats() {
    const [
      totalProducts,
      lowStock,
      outOfStock,
      vendors
    ] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true, stock: { gt: 0, lte: 10 } } }),
      this.prisma.product.count({ where: { isActive: true, stock: 0 } }),
      this.prisma.vendor.count({ where: { isActive: true } })
    ]);

    return {
      totalProducts,
      lowStock,
      outOfStock,
      activeVendors: vendors,
      totalValue: 0
    };
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock items' })
  async getLowStock(@Query() query: { page?: number; limit?: number; vendorId?: string }) {
    const { page = 1, limit = 20, vendorId } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true, stock: { gt: 0, lte: 10 } };
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          title: true,
          sku: true,
          price: true,
          stock: true,
          vendorId: true,
          Vendor: { select: { storeName: true } },
          Category: { select: { name: true } }
        },
        orderBy: { stock: 'asc' }
      })
    ]);

    return {
      data: data.map(item => ({
        id: item.id,
        productId: item.id,
        productName: item.title,
        sku: item.sku,
        stock: item.stock,
        reorderPoint: 10,
        vendorId: item.vendorId,
        vendorName: item.Vendor?.storeName,
        categoryName: item.Category?.name,
        lastUpdated: new Date()
      })),
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    };
  }

  @Get('out-of-stock')
  @ApiOperation({ summary: 'Get out of stock items' })
  async getOutOfStock(@Query() query: { page?: number; limit?: number; vendorId?: string }) {
    const { page = 1, limit = 20, vendorId } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true, stock: 0 };
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          title: true,
          sku: true,
          stock: true,
          vendorId: true,
          Vendor: { select: { storeName: true } },
          Category: { select: { name: true } },
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    return {
      data: data.map(item => ({
        id: item.id,
        productId: item.id,
        productName: item.title,
        sku: item.sku,
        stock: 0,
        vendorId: item.vendorId,
        vendorName: item.Vendor?.storeName,
        categoryName: item.Category?.name,
        lastUpdated: item.updatedAt
      })),
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    };
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movements' })
  async getMovements(@Query() query: { page?: number; limit?: number; productId?: string; vendorId?: string }) {
    // For now, return empty since stock movements might not be set up
    return {
      data: [],
      meta: { total: 0, page: 1, limit: Number(query.limit || 50), totalPages: 0 }
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get inventory alerts' })
  async getAlerts(@Query() query: { isRead?: string }) {
    const [lowStock, outOfStock] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true, stock: { gt: 0, lte: 10 } },
        select: { id: true, title: true, stock: true, vendorId: true, updatedAt: true },
        take: 10
      }),
      this.prisma.product.findMany({
        where: { isActive: true, stock: 0 },
        select: { id: true, title: true, vendorId: true, updatedAt: true },
        take: 10
      })
    ]);

    const alerts = [
      ...lowStock.map(item => ({
        id: `low-${item.id}`,
        type: 'LOW_STOCK',
        severity: 'MEDIUM',
        message: `${item.title} is running low (${item.stock} units)`,
        productId: item.id,
        isRead: false,
        createdAt: item.updatedAt
      })),
      ...outOfStock.map(item => ({
        id: `oos-${item.id}`,
        type: 'OUT_OF_STOCK',
        severity: 'HIGH',
        message: `${item.title} is out of stock`,
        productId: item.id,
        isRead: false,
        createdAt: item.updatedAt
      }))
    ];

    return { data: alerts };
  }

  // Vendors (instead of warehouses)
  @Get('vendors')
  @ApiOperation({ summary: 'Get all vendors with inventory' })
  async getVendorsWithInventory() {
    const vendors = await this.prisma.vendor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        storeName: true,
        _count: { select: { Product: true } }
      },
      orderBy: { storeName: 'asc' }
    });

    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        const [totalProducts, lowStock, outOfStock] = await Promise.all([
          this.prisma.product.count({ where: { vendorId: vendor.id, isActive: true } }),
          this.prisma.product.count({ where: { vendorId: vendor.id, isActive: true, stock: { gt: 0, lte: 10 } } }),
          this.prisma.product.count({ where: { vendorId: vendor.id, isActive: true, stock: 0 } })
        ]);

        return {
          id: vendor.id,
          storeName: vendor.storeName,
          totalProducts,
          lowStock,
          outOfStock
        };
      })
    );

    return { data: vendorsWithStats };
  }

  @Get('vendor/:vendorId/products')
  @ApiOperation({ summary: 'Get products for a specific vendor' })
  async getVendorProducts(
    @Param('vendorId') vendorId: string,
    @Query() query: { page?: number; limit?: number; search?: string; categoryId?: string }
  ) {
    const { page = 1, limit = 50, search, categoryId } = query;
    const skip = (page - 1) * limit;

    const where: any = { vendorId, isActive: true };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          title: true,
          sku: true,
          price: true,
          offerPrice: true,
          stock: true,
          isActive: true,
          categoryId: true,
          Category: { select: { name: true } },
          images: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data: products.map(p => ({
        id: p.id,
        name: p.title,
        sku: p.sku,
        price: p.price,
        salePrice: p.offerPrice || p.price,
        stock: p.stock || 0,
        status: p.isActive ? 'ACTIVE' : 'INACTIVE',
        categoryId: p.categoryId,
        categoryName: p.Category?.name,
        imageUrl: p.images?.[0] || null
      })),
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    };
  }

  // Purchase Orders (simplified - per vendor)
  @Get('purchase-orders')
  @ApiOperation({ summary: 'Get purchase orders' })
  async getPurchaseOrders(@Query() query: { page?: number; limit?: number; vendorId?: string; status?: string }) {
    return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }

  @Post('purchase-orders')
  @ApiOperation({ summary: 'Create purchase order' })
  async createPurchaseOrder(@Body() dto: any) {
    throw new Error('Purchase orders feature coming soon');
  }

  // Cycle Counts
  @Get('cycle-counts')
  @ApiOperation({ summary: 'Get cycle counts' })
  async getCycleCounts(@Query() query: { page?: number; limit?: number }) {
    return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID (Product)' })
  async findOne(@Param('id') id: string) {
    const item = await this.prisma.product.findUnique({
      where: { id },
      include: {
        Vendor: { select: { id: true, storeName: true } }
      }
    });

    if (!item) throw new Error('Product not found');
    
    return {
        id: item.id,
        productId: item.id,
        productName: item.title,
        sku: item.sku,
        stock: item.stock,
        vendorName: item.Vendor?.storeName
    };
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Update stock quantity (Product)' })
  async updateStock(
    @Param('id') id: string,
    @Body() dto: { stock: number; reason?: string }
  ) {
    // ID here is Product ID
    const item = await this.prisma.product.update({
      where: { id },
      data: { stock: dto.stock }
    });

    // Optionally create stock movement if needed, but skipping for now as "Inventory" table is deprecated
    return item;
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Adjust stock quantity' })
  async adjustStock(
    @Param('id') id: string,
    @Body() dto: { quantity: number; reason: string }
  ) {
    const current = await this.prisma.product.findUnique({ where: { id } });
    if (!current) throw new Error('Product not found');

    const newStock = Math.max(0, current.stock + dto.quantity);
    
    const item = await this.prisma.product.update({
      where: { id },
      data: { stock: newStock }
    });

    return item;
  }

  // Warehouses - DEPRECATED / REMOVED
  @Get('warehouses/all')
  @ApiOperation({ summary: 'Get all warehouses' })
  async getWarehouses() {
    return [];
  }

  // Stock Movements
  @Get('movements/all')
  @ApiOperation({ summary: 'Get stock movements' })
  async getStockMovements(@Query() query: { page?: number; limit?: number }) {
    return {
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 }
    };
  }
}
