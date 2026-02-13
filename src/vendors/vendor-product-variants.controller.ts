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
import { VendorProductVariantsService } from './vendor-product-variants.service';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
  BulkCreateVariantsDto,
  ProductVariantQueryDto,
} from './dto/vendor-product-variant.dto';

@ApiTags('Vendor Product Variants')
@ApiBearerAuth()
@Controller('vendors/products/:productId/variants')
@UseGuards(JwtAuthGuard)
export class VendorProductVariantsController {
  constructor(
    private readonly variantsService: VendorProductVariantsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all variants for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Variants retrieved successfully' })
  async findAll(
    @Request() req: any,
    @Param('productId') productId: string,
    @Query() query: ProductVariantQueryDto,
  ) {
    return this.variantsService.findAll(productId, req.user.id, query);
  }

  @Get(':variantId')
  @ApiOperation({ summary: 'Get a specific variant' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiParam({ name: 'variantId', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Variant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async findOne(
    @Request() req: any,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.variantsService.findOne(productId, variantId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product variant' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 201, description: 'Variant created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or SKU already exists',
  })
  @ApiResponse({ status: 403, description: 'Not product owner' })
  async create(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.variantsService.create(productId, req.user.id, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create product variants' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 201,
    description: 'Variants created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or SKU conflicts',
  })
  async bulkCreate(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: BulkCreateVariantsDto,
  ) {
    return this.variantsService.bulkCreate(productId, req.user.id, dto);
  }

  @Patch(':variantId')
  @ApiOperation({ summary: 'Update a product variant' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiParam({ name: 'variantId', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async update(
    @Request() req: any,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.variantsService.update(
      productId,
      variantId,
      req.user.id,
      dto,
    );
  }

  @Delete(':variantId')
  @ApiOperation({ summary: 'Delete a product variant' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiParam({ name: 'variantId', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Variant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async delete(
    @Request() req: any,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.variantsService.delete(productId, variantId, req.user.id);
  }
}
