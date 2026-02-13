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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorProductsService } from './vendor-products.service';
import {
  CreateVendorProductDto,
  UpdateVendorProductDto,
  UpdateStockDto,
  VendorProductQueryDto,
} from './dto/vendor-product.dto';

@ApiTags('Vendor Products')
@ApiBearerAuth()
@Controller('vendors/products')
@UseGuards(JwtAuthGuard)
export class VendorProductsController {
  constructor(private readonly vendorProductsService: VendorProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'SKU limit reached or invalid data' })
  async create(@Request() req: any, @Body() dto: CreateVendorProductDto) {
    return this.vendorProductsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List vendor products with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findAll(@Request() req: any, @Query() query: VendorProductQueryDto) {
    return this.vendorProductsService.findAll(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Product does not belong to vendor' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.vendorProductsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Product does not belong to vendor' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVendorProductDto,
  ) {
    return this.vendorProductsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a product (set status to INACTIVE)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Product does not belong to vendor' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.vendorProductsService.softDelete(req.user.id, id);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Quick stock update' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 403, description: 'Product does not belong to vendor' })
  async updateStock(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.vendorProductsService.updateStock(req.user.id, id, dto);
  }
}
