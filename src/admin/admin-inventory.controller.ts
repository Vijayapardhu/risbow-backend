import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminInventoryService } from './admin-inventory.service';

class InventoryFilterDto {
  vendorId?: string;
  categoryId?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

class AdjustStockDto {
  productId: string;
  quantity: number;
  reason?: string;
}

class BulkAdjustDto {
  adjustments: Array<{
    productId: string;
    quantity: number;
    reason?: string;
  }>;
}

@ApiTags('Admin Inventory')
@ApiBearerAuth()
@Controller('admin/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminInventoryController {
  constructor(private readonly inventoryService: AdminInventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get inventory overview across all vendors' })
  @ApiResponse({
    status: 200,
    description: 'Inventory items with vendor info',
  })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'outOfStock', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getInventory(@Query() filters: InventoryFilterDto) {
    return this.inventoryService.getInventoryOverview(filters);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get all low stock items across vendors' })
  @ApiResponse({
    status: 200,
    description: 'Products below low stock threshold',
  })
  async getLowStockItems(@Query() filters: InventoryFilterDto) {
    return this.inventoryService.getLowStockItems(filters);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movement history' })
  @ApiResponse({
    status: 200,
    description: 'Stock adjustment history with admin info',
  })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getStockMovements(@Query() filters: any) {
    return this.inventoryService.getStockMovements(filters);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Adjust stock for a product' })
  @ApiResponse({
    status: 200,
    description: 'Stock adjusted successfully',
  })
  async adjustStock(
    @Request() req,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(
      req.user.id,
      dto.productId,
      dto.quantity,
      dto.reason,
    );
  }

  @Post('bulk-adjust')
  @ApiOperation({ summary: 'Bulk adjust stock for multiple products' })
  @ApiResponse({
    status: 200,
    description: 'Bulk stock adjustment completed',
  })
  async bulkAdjustStock(
    @Request() req,
    @Body() dto: BulkAdjustDto,
  ) {
    return this.inventoryService.bulkAdjustStock(req.user.id, dto.adjustments);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory statistics' })
  @ApiResponse({
    status: 200,
    description: 'Inventory statistics by vendor and category',
  })
  async getInventoryStats(@Query('vendorId') vendorId?: string) {
    return this.inventoryService.getInventoryStats(vendorId);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get inventory for a specific vendor' })
  @ApiResponse({
    status: 200,
    description: 'Vendor inventory items',
  })
  async getVendorInventory(
    @Param('vendorId') vendorId: string,
    @Query() filters: InventoryFilterDto,
  ) {
    return this.inventoryService.getVendorInventory(vendorId, filters);
  }

  @Patch(':productId/threshold')
  @ApiOperation({ summary: 'Update low stock threshold for a product' })
  @ApiResponse({
    status: 200,
    description: 'Threshold updated',
  })
  async updateThreshold(
    @Param('productId') productId: string,
    @Body() body: { lowStockThreshold: number },
  ) {
    return this.inventoryService.updateLowStockThreshold(
      productId,
      body.lowStockThreshold,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export inventory data as CSV' })
  @ApiResponse({
    status: 200,
    description: 'CSV export data',
  })
  async exportInventory(@Query() filters: InventoryFilterDto) {
    return this.inventoryService.exportInventoryCSV(filters);
  }
}
