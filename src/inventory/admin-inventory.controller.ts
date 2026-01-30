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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin - Inventory')
@Controller('admin/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminInventoryController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory items' })
  async findAll(
    @Query() query: { page?: number; limit?: number; search?: string; lowStock?: boolean; outOfStock?: boolean }
  ) {
    const { page = 1, limit = 10, search, lowStock, outOfStock } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.product = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    if (outOfStock) {
      where.stock = 0;
    } else if (lowStock) {
      where.stock = { gt: 0, lte: { reorderPoint: 10 } }; // Using 10 as default reorder point
    }

    const [total, data] = await Promise.all([
      this.prisma.inventory.count({ where }),
      this.prisma.inventory.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          product: { select: { id: true, title: true, sku: true, price: true } },
          warehouse: { select: { id: true, name: true } }
        },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    return {
      data: data.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.title,
        sku: item.product?.sku,
        stock: item.stock,
        reservedStock: item.reservedStock || 0,
        availableStock: item.stock - (item.reservedStock || 0),
        reorderPoint: item.reorderPoint || 10,
        reorderQuantity: item.reorderQuantity || 50,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse?.name,
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
      warehouses
    ] = await Promise.all([
      this.prisma.inventory.count(),
      this.prisma.inventory.count({ where: { stock: { gt: 0, lte: 10 } } }),
      this.prisma.inventory.count({ where: { stock: 0 } }),
      this.prisma.warehouse.count()
    ]);

    return {
      totalProducts,
      lowStock,
      outOfStock,
      warehouses,
      totalValue: 0 // Would need to calculate based on product prices
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  async findOne(@Param('id') id: string) {
    const item = await this.prisma.inventory.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, title: true, sku: true } },
        warehouse: { select: { id: true, name: true } }
      }
    });

    if (!item) throw new Error('Inventory item not found');
    return item;
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Update stock quantity' })
  async updateStock(
    @Param('id') id: string,
    @Body() dto: { stock: number; reason?: string }
  ) {
    const item = await this.prisma.inventory.update({
      where: { id },
      data: { stock: dto.stock },
      include: {
        product: { select: { id: true, title: true } }
      }
    });

    // Create stock movement record
    await this.prisma.stockMovement.create({
      data: {
        inventoryId: id,
        type: 'ADJUSTMENT',
        quantity: dto.stock - (item.stock || 0),
        reason: dto.reason || 'Manual adjustment',
        createdBy: 'admin' // Should be current user
      }
    });

    return item;
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Adjust stock quantity' })
  async adjustStock(
    @Param('id') id: string,
    @Body() dto: { quantity: number; reason: string }
  ) {
    const current = await this.prisma.inventory.findUnique({ where: { id } });
    if (!current) throw new Error('Inventory item not found');

    const newStock = Math.max(0, current.stock + dto.quantity);
    
    const item = await this.prisma.inventory.update({
      where: { id },
      data: { stock: newStock }
    });

    // Create stock movement record
    await this.prisma.stockMovement.create({
      data: {
        inventoryId: id,
        type: 'ADJUSTMENT',
        quantity: dto.quantity,
        reason: dto.reason,
        createdBy: 'admin'
      }
    });

    return item;
  }

  // Warehouses
  @Get('warehouses/all')
  @ApiOperation({ summary: 'Get all warehouses' })
  async getWarehouses() {
    return this.prisma.warehouse.findMany({
      orderBy: { name: 'asc' }
    });
  }

  @Post('warehouses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create warehouse' })
  async createWarehouse(@Body() dto: { name: string; location: string; manager?: string }) {
    return this.prisma.warehouse.create({
      data: {
        name: dto.name,
        location: dto.location,
        isActive: true
      }
    });
  }

  @Patch('warehouses/:id')
  @ApiOperation({ summary: 'Update warehouse' })
  async updateWarehouse(
    @Param('id') id: string,
    @Body() dto: { name?: string; location?: string; isActive?: boolean }
  ) {
    return this.prisma.warehouse.update({
      where: { id },
      data: dto
    });
  }

  @Delete('warehouses/:id')
  @ApiOperation({ summary: 'Delete warehouse' })
  async deleteWarehouse(@Param('id') id: string) {
    await this.prisma.warehouse.delete({ where: { id } });
    return { message: 'Warehouse deleted successfully' };
  }

  // Stock Movements
  @Get('movements/all')
  @ApiOperation({ summary: 'Get stock movements' })
  async getStockMovements(@Query() query: { page?: number; limit?: number }) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.stockMovement.count(),
      this.prisma.stockMovement.findMany({
        skip,
        take: Number(limit),
        include: {
          inventory: {
            include: {
              product: { select: { id: true, title: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data: data.map(m => ({
        id: m.id,
        productId: m.inventory?.productId,
        productName: m.inventory?.product?.title,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        reference: m.reference,
        createdBy: m.createdBy,
        createdAt: m.createdAt
      })),
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    };
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  async transferStock(
    @Body() dto: {
      productId: string;
      fromWarehouseId: string;
      toWarehouseId: string;
      quantity: number;
      reason?: string;
    }
  ) {
    // Find source inventory
    const sourceInventory = await this.prisma.inventory.findFirst({
      where: { productId: dto.productId, warehouseId: dto.fromWarehouseId }
    });

    if (!sourceInventory || sourceInventory.stock < dto.quantity) {
      throw new Error('Insufficient stock in source warehouse');
    }

    // Find or create destination inventory
    let destInventory = await this.prisma.inventory.findFirst({
      where: { productId: dto.productId, warehouseId: dto.toWarehouseId }
    });

    if (!destInventory) {
      destInventory = await this.prisma.inventory.create({
        data: {
          productId: dto.productId,
          warehouseId: dto.toWarehouseId,
          stock: 0
        }
      });
    }

    // Perform transfer in transaction
    await this.prisma.$transaction([
      // Decrease source
      this.prisma.inventory.update({
        where: { id: sourceInventory.id },
        data: { stock: { decrement: dto.quantity } }
      }),
      // Increase destination
      this.prisma.inventory.update({
        where: { id: destInventory.id },
        data: { stock: { increment: dto.quantity } }
      }),
      // Create movement records
      this.prisma.stockMovement.create({
        data: {
          inventoryId: sourceInventory.id,
          type: 'TRANSFER',
          quantity: -dto.quantity,
          reason: `Transfer to ${dto.toWarehouseId}: ${dto.reason || 'No reason'}`,
          createdBy: 'admin'
        }
      }),
      this.prisma.stockMovement.create({
        data: {
          inventoryId: destInventory.id,
          type: 'TRANSFER',
          quantity: dto.quantity,
          reason: `Transfer from ${dto.fromWarehouseId}: ${dto.reason || 'No reason'}`,
          createdBy: 'admin'
        }
      })
    ]);

    return { message: 'Stock transferred successfully' };
  }
}
