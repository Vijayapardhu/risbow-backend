import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
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
import { VendorProductsService } from './vendor-products.service';
import {
  CreateVendorProductDto,
  UpdateVendorProductDto,
  UpdateStockDto,
  VendorProductQueryDto,
} from './dto/vendor-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Vendor Products (Alias)')
@ApiBearerAuth()
@Controller('vendor-products')
@UseGuards(JwtAuthGuard)
export class VendorProductsAliasController {
  constructor(private readonly vendorProductsService: VendorProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  async create(@Request() req: any, @Body() dto: CreateVendorProductDto) {
    return this.vendorProductsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List vendor products' })
  async findAll(@Request() req: any, @Query() query: VendorProductQueryDto) {
    return this.vendorProductsService.findAll(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single product by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.vendorProductsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVendorProductDto,
  ) {
    return this.vendorProductsService.update(req.user.id, id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product (alias)' })
  async updatePut(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVendorProductDto,
  ) {
    return this.vendorProductsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a product' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.vendorProductsService.softDelete(req.user.id, id);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Quick stock update' })
  async updateStock(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.vendorProductsService.updateStock(req.user.id, id, dto);
  }
}
