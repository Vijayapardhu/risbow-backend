import { Controller, Get, Post, Patch, Delete, Put, Body, Query, Param, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateProductDto, ProductFilterDto, UpdateProductDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Products')
@Controller('products')
export class CatalogController {
        @Get('admin/search-miss')
        @UseGuards(JwtAuthGuard, RolesGuard)
        @Roles('ADMIN', 'SUPER_ADMIN')
        @ApiOperation({ summary: 'Admin: Get product search miss analytics' })
        @ApiResponse({ status: 200, description: 'Search miss analytics' })
        async getSearchMissAnalytics(@Query('days') days: string) {
            return this.catalogService.getSearchMissAnalytics(Number(days) || 30);
        }

        @Get('admin/demand-gaps')
        @UseGuards(JwtAuthGuard, RolesGuard)
        @Roles('ADMIN', 'SUPER_ADMIN')
        @ApiOperation({ summary: 'Admin: Get demand gap trends' })
        @ApiResponse({ status: 200, description: 'Demand gap trends' })
        async getDemandGapTrends(@Query('days') days: string) {
            return this.catalogService.getDemandGapTrends(Number(days) || 30);
        }
    @Post('reserve-stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CUSTOMER', 'VENDOR')
    @ApiOperation({ summary: 'Reserve product variant stock (atomic, 15 min TTL)' })
    @ApiResponse({ status: 200, description: 'Stock reserved' })
    async reserveStock(@Body() body: { productId: string; variantId: string; quantity: number }, @Request() req) {
        return this.catalogService.reserveStock(body.productId, body.variantId, body.quantity, req.user.id);
    }

    @Post('release-stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CUSTOMER', 'VENDOR')
    @ApiOperation({ summary: 'Release reserved product variant stock' })
    @ApiResponse({ status: 200, description: 'Stock released' })
    async releaseStock(@Body() body: { productId: string; variantId: string; quantity: number }, @Request() req) {
        return this.catalogService.releaseReservedStock(body.productId, body.variantId, body.quantity, req.user.id);
    }
    constructor(private readonly catalogService: CatalogService) { }

    @Get()
    async findAll(@Query() filters: ProductFilterDto, @Request() req) {
        return this.catalogService.findAll(filters, req?.user?.id);
    }

    @Get('nearby')
    @ApiOperation({ summary: 'Get nearby products (hyperlocal discovery)' })
    async nearbyProducts(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radiusKm') radiusKm?: string,
        @Query('categoryId') categoryId?: string,
        @Query('inStock') inStock?: string,
        @Query('limit') limit?: string,
    ) {
        return this.catalogService.getNearbyProducts({
            lat: Number(lat),
            lng: Number(lng),
            radiusKm: Number(radiusKm) || 10,
            categoryId,
            inStock: inStock === 'true' || inStock === '1',
            limit: Math.min(50, Math.max(1, Number(limit) || 20)),
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.catalogService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
    async create(@Body() createProductDto: CreateProductDto) {
        return this.catalogService.createProduct(createProductDto);
    }

    @Post('bulk')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
    @UseInterceptors(FileInterceptor('file'))
    async bulkUpload(@UploadedFile() file: any, @Request() req) {
        if (!file) throw new Error('File not present');
        const content = file.buffer.toString('utf-8');
        const vendorId = req.user?.vendorId || req.user?.id;
        return this.catalogService.processBulkUpload(vendorId, content);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
    async update(@Param('id') id: string, @Body() body: UpdateProductDto) {
        return this.catalogService.updateProduct(id, body);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
    async remove(@Param('id') id: string) {
        return this.catalogService.deleteProduct(id);
    }
}

@ApiTags('Catalog')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly catalogService: CatalogService) { }

    @Get()
    async getAll(@Query('includeInactive') includeInactive?: string) {
        return this.catalogService.getCategories(includeInactive === 'true');
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.catalogService.getCategory(id);
    }

    @Get(':id/rules')
    async getRules(@Param('id') id: string) {
        return this.catalogService.getCategoryRules(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async create(@Body() body: any) {
        return this.catalogService.createCategory(body);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.catalogService.updateCategory(id, body);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async remove(@Param('id') id: string) {
        return this.catalogService.deleteCategory(id);
    }

    // Category Specifications
    @Get(':id/specs')
    async getCategorySpecs(@Param('id') id: string, @Query('includeInactive') includeInactive?: string) {
        return this.catalogService.getCategorySpecs(id, includeInactive === 'true');
    }

    @Post(':id/specs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async createCategorySpec(@Param('id') id: string, @Body() body: any) {
        return this.catalogService.createCategorySpec(id, body);
    }

    @Patch('specs/:specId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async updateCategorySpec(@Param('specId') specId: string, @Body() body: any) {
        return this.catalogService.updateCategorySpec(specId, body);
    }

    @Delete('specs/:specId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async deleteCategorySpec(@Param('specId') specId: string) {
        return this.catalogService.deleteCategorySpec(specId);
    }

    @Put(':id/specs/reorder')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async reorderSpecs(@Param('id') id: string, @Body() body: any) {
        return this.catalogService.reorderSpecs(id, body.specs);
    }
}
