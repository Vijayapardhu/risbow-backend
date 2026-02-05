import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
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
import { VendorInventoryService } from './vendor-inventory.service';
import {
  BulkStockUpdateDto,
  SingleStockUpdateDto,
  UpdateThresholdDto,
  InventoryFilterDto,
  InventoryProductDto,
  LowStockAlertDto,
  InventoryValuationDto,
} from './dto/vendor-inventory.dto';

@ApiTags('Vendor Inventory')
@ApiBearerAuth()
@Controller('vendors/inventory')
@UseGuards(JwtAuthGuard)
export class VendorInventoryController {
  constructor(private readonly inventoryService: VendorInventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get inventory overview with stock info' })
  @ApiResponse({
    status: 200,
    description: 'List of products with stock information',
    type: [InventoryProductDto],
  })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'outOfStock', required: false, type: Boolean })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getInventoryOverview(
    @Request() req,
    @Query() filters: InventoryFilterDto,
  ): Promise<InventoryProductDto[]> {
    return this.inventoryService.getInventoryOverview(req.user.id, filters);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiResponse({
    status: 200,
    description: 'Products needing restock',
    type: LowStockAlertDto,
  })
  async getLowStockAlerts(@Request() req): Promise<LowStockAlertDto> {
    return this.inventoryService.getLowStockAlerts(req.user.id);
  }

  @Patch('stock')
  @ApiOperation({ summary: 'Bulk update stock levels for multiple products' })
  @ApiResponse({
    status: 200,
    description: 'Bulk stock update result',
  })
  async bulkUpdateStock(
    @Request() req,
    @Body() dto: BulkStockUpdateDto,
  ): Promise<{ updated: number; failed: string[] }> {
    return this.inventoryService.bulkUpdateStock(req.user.id, dto);
  }

  @Patch(':productId/stock')
  @ApiOperation({ summary: 'Update stock for a single product' })
  @ApiResponse({
    status: 200,
    description: 'Updated product stock info',
  })
  async updateSingleStock(
    @Request() req,
    @Param('productId') productId: string,
    @Body() dto: SingleStockUpdateDto,
  ): Promise<{ success: boolean; product: InventoryProductDto }> {
    return this.inventoryService.updateSingleStock(
      req.user.id,
      productId,
      dto,
    );
  }

  @Patch(':productId/threshold')
  @ApiOperation({ summary: 'Set low stock threshold for a product' })
  @ApiResponse({
    status: 200,
    description: 'Threshold update result',
  })
  async updateThreshold(
    @Request() req,
    @Param('productId') productId: string,
    @Body() dto: UpdateThresholdDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.inventoryService.updateThreshold(req.user.id, productId, dto);
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get inventory valuation with category breakdown' })
  @ApiResponse({
    status: 200,
    description: 'Total inventory value and breakdown by category',
    type: InventoryValuationDto,
  })
  async getInventoryValuation(@Request() req): Promise<InventoryValuationDto> {
    return this.inventoryService.getInventoryValuation(req.user.id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get inventory summary counts' })
  @ApiResponse({
    status: 200,
    description: 'Summary of product stock statuses',
  })
  async getInventorySummary(@Request() req) {
    return this.inventoryService.getInventorySummary(req.user.id);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movement history' })
  @ApiResponse({
    status: 200,
    description: 'Stock adjustment history with audit trail',
  })
  async getMovements(@Request() req, @Query() filters: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.inventoryService.getStockMovements(vendorId, filters);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Adjust stock for a product' })
  @ApiResponse({
    status: 200,
    description: 'Stock adjusted successfully with audit log',
  })
  async adjustStock(
    @Request() req,
    @Body() dto: { productId: string; quantity: number; reason?: string },
  ) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.inventoryService.adjustStock(
      vendorId,
      dto.productId,
      dto.quantity,
      dto.reason,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory statistics' })
  @ApiResponse({
    status: 200,
    description: 'Inventory stats including total products, low stock, etc.',
  })
  async getStats(@Request() req) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.inventoryService.getInventoryStats(vendorId);
  }
}
