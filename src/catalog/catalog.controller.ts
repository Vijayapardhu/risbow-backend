import { Controller, Get, Post, Patch, Delete, Put, Body, Query, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateProductDto, ProductFilterDto, UpdateProductDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) { }

    @Get()
    async findAll(@Query() filters: ProductFilterDto) {
        return this.catalogService.findAll(filters);
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
    async bulkUpload(@UploadedFile() file: any) {
        if (!file) throw new Error('File not present');
        const content = file.buffer.toString('utf-8');
        return this.catalogService.processBulkUpload(content);
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

@Controller('gifts')
export class GiftsController {
    constructor(private readonly catalogService: CatalogService) { }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async getAll() {
        return this.catalogService.getAllGifts();
    }

    @Get('eligible')
    async getEligible(@Query('cartValue') cartValue: string, @Query('categoryIds') categoryIds?: string) {
        const val = parseInt(cartValue, 10) || 0;
        const cats = categoryIds ? categoryIds.split(',') : [];
        return this.catalogService.getEligibleGifts(val, cats);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async create(@Body() body: any) {
        return this.catalogService.createGift(body);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.catalogService.updateGift(id, body);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async remove(@Param('id') id: string) {
        return this.catalogService.deleteGift(id);
    }
}
